import type Stripe from "stripe";
import { getPassTier } from "@/app/data/passes";
import { NO_DISCOUNT, fulfillPassOrder, type PassOrder, type PassOrderItem } from "@/lib/fulfillment";
import { formatBookingDate, formatSlotTime } from "./booking-config";
import {
  attachCheckoutSession,
  getBookingBySessionId,
  markBookingPaid,
  markConfirmationSent,
  recordConfirmationFailure,
  type StoredTeamBooking,
} from "./bookings-db";
import { ensureTeamForBooking } from "./teams-db";

/**
 * Where a paid team booking becomes a confirmed one — and a Traveloop order.
 *
 * Team bookings share the Stripe account and webhook with Traveloop passes.
 * `kind` in the session metadata is what tells the webhook which fulfilment a
 * session belongs to: the booking has to be marked paid here, against its
 * slot, before it is handed to the pass fulfilment as an order.
 *
 * The team price includes a Traveloop Platinum Pass for every racer, so once
 * paid a booking goes through exactly what a pass purchase does: the payer's
 * customer account (created on their first purchase, with a welcome email),
 * an order on /admin, a numbered pass per racer to collect at the airport,
 * and an invoice. The order shares the checkout session id, which is the
 * link between the two records.
 *
 * A paid booking is also a team in the live station game, ready for a
 * gamemaster to claim on race day. That team is linked by the Booking ID.
 */
export const TEAM_BOOKING_KIND = "urban_sprint_booking";

/** The tier every racer gets. Urban Sprint never sells another. */
const INCLUDED_PASS = "platinum";

export function isTeamBookingSession(session: { metadata?: Stripe.Metadata | null }): boolean {
  return session.metadata?.kind === TEAM_BOOKING_KIND;
}

type Payment = {
  paymentIntentId: string | null;
  payerEmail: string | null;
  payerName: string | null;
  payerPhone: string | null;
};

/** From the webhook: a checkout session Stripe says is paid. */
export async function fulfilTeamBookingSession(session: Stripe.Checkout.Session): Promise<void> {
  const details = session.customer_details;

  // The checkout route links the booking to its session after Stripe creates
  // it; if that one write failed, the id in the metadata is the way back.
  const bookingId = Number(session.metadata?.bookingId);
  if (Number.isInteger(bookingId) && bookingId > 0 && !(await getBookingBySessionId(session.id))) {
    await attachCheckoutSession(bookingId, session.id);
  }

  await completeTeamBooking(session.id, {
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
    payerEmail: details?.email ?? session.customer_email ?? null,
    payerName: details?.name ?? null,
    payerPhone: details?.phone ?? null,
  });
}

/**
 * Marks the booking paid, then fulfils it as a Traveloop order. Safe to
 * repeat: Stripe redelivers events, and every step here and in
 * fulfillPassOrder checks whether it already happened.
 */
export async function completeTeamBooking(sessionId: string, payment: Payment): Promise<StoredTeamBooking> {
  const result = await markBookingPaid(sessionId, payment);

  // Thrown, not logged: a 500 makes Stripe retry, and a paid session with no
  // booking behind it is something a person needs to look at.
  if (!result) throw new Error(`No Urban Sprint booking for checkout ${sessionId}.`);

  const { booking, previousStatus } = result;

  if (previousStatus !== "paid") {
    console.info("[us-booking] Team booked:", {
      reference: booking.reference,
      team: booking.teamName,
      slot: `${booking.date} ${booking.time}`,
      size: booking.teamSize,
      email: booking.payerEmail,
    });
  }

  if (previousStatus === "expired" || previousStatus === "failed" || previousStatus === "cancelled") {
    console.error(
      `[us-booking] ${booking.reference} was paid after its hold was released (${previousStatus}). ` +
        `Its place may have been sold again — check ${booking.date} ${booking.time} for more teams than the slot holds.`
    );
  }

  // Throws if the order can't be recorded, which fails the webhook so Stripe
  // retries; the booking is already paid, so the retry picks up from here.
  const { receipt } = await fulfillPassOrder(teamOrder(sessionId, booking, payment));

  // One email covers both records: the order's receipt carries the race. The
  // booking keeps its own copy of the outcome for the Urban Sprint console.
  if (!booking.confirmationSentAt) {
    if (receipt.sent) await markConfirmationSent(booking.id);
    else await recordConfirmationFailure(booking.id, receipt.reason);
  }

  // Last, so the money, passes and receipt never wait on the game. A failure
  // here still fails the webhook, and Stripe's retry adds the team.
  await ensureTeamForBooking(booking);

  return booking;
}

/** The booking as a Traveloop order: the team entry, with a Platinum Pass per racer. */
function teamOrder(sessionId: string, booking: StoredTeamBooking, payment: Payment): PassOrder {
  const tier = getPassTier(INCLUDED_PASS);
  if (!tier) throw new Error(`Pass tier "${INCLUDED_PASS}" is missing from passes.ts.`);

  const items: PassOrderItem[] = booking.participants.map((participant) => ({
    passKey: tier.key,
    passName: tier.name,
    // Included in the team price, which is the order's only charge.
    unitAmountCents: 0,
    registration: {
      fullName: participant.fullName,
      nationality: participant.nationality,
      // Participants booked before the form asked for these raced on the
      // day, so the day is the trip their cover needs.
      arrivalDate: participant.arrivalDate ?? booking.date,
      departureDate: participant.departureDate ?? booking.date,
      // The /passes/register list's wording, which is what the insurer is
      // sent: a MyKad is Malaysia's national ID.
      travelDocumentType: participant.documentType === "mykad" ? "National ID" : "Passport",
      travelDocumentNumber: participant.documentNumber,
      address: participant.address ?? "",
      emergencyContactName: participant.emergencyContactName,
      emergencyContactPhone: participant.emergencyContactPhone,
      emergencyContactRelationship: participant.emergencyContactRelationship,
      // Both declarations are ticked together, before payment.
      termsAcceptedAt: booking.termsAcceptedAt,
    },
  }));

  const payerEmail = payment.payerEmail ?? booking.payerEmail;
  const payerIndex = payerEmail
    ? booking.participants.findIndex((p) => p.email.toLowerCase() === payerEmail.toLowerCase())
    : -1;

  return {
    sessionId,
    product: {
      kind: "urban_sprint",
      reference: booking.reference,
      description: `${booking.teamName} · ${formatBookingDate(booking.date)}, ${formatSlotTime(booking.time)}`,
    },
    draftId: null,
    items,
    amountTotal: booking.amountCents,
    currency: booking.currency,
    customerEmail: payerEmail,
    customerName: payment.payerName ?? booking.payerName,
    customerPhone: payment.payerPhone ?? booking.payerPhone,
    paymentIntentId: payment.paymentIntentId,
    discount: NO_DISCOUNT,
    // The payer's portal profile is filled from their own registration when
    // they're racing, and left alone when they're paying for someone else.
    buyerItem: payerIndex >= 0 ? payerIndex : null,
  };
}
