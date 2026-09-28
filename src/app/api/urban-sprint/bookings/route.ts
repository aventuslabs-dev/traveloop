import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSiteUrl, getStripe, isPaymentsBypassEnabled } from "@/lib/stripe";
import {
  BOOKING_CURRENCY,
  CHECKOUT_SESSION_MINUTES,
  TEAM_PRICE_CENTS,
  formatBookingDate,
  formatSlotTime,
} from "@/lib/urban-sprint/booking-config";
import { validateBooking } from "@/lib/urban-sprint/booking-form";
import {
  SlotFullError,
  attachCheckoutSession,
  createPendingBooking,
  releaseBooking,
} from "@/lib/urban-sprint/bookings-db";
import { TEAM_BOOKING_KIND, completeTeamBooking } from "@/lib/urban-sprint/booking-fulfillment";
import { getSettings } from "@/lib/urban-sprint/settings-db";

export const runtime = "nodejs";

/**
 * Books a team into an Urban Sprint slot and returns where to pay.
 *
 * The team price includes a Traveloop Platinum Pass for every racer, so each
 * participant arrives with the pass's insurance registration too; once paid,
 * the webhook turns the booking into a Traveloop order with those passes (see
 * lib/urban-sprint/booking-fulfillment).
 *
 * The browser sends the slot, team name and participants — never a price or a
 * place count. The booking is validated again here, written as a hold (which
 * the database refuses if the slot is full), and only then sent to Stripe, so
 * a buyer is never charged for a place that wasn't there.
 *
 * Campaign copy is English-only (see the urban-sprint layout), so errors here
 * are finished English sentences the form shows as-is.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const now = new Date();
  const result = validateBooking(body, now);
  if (!result.ok) {
    return NextResponse.json(
      { error: Object.values(result.errors)[0], errors: result.errors },
      { status: 400 }
    );
  }

  const booking = result.value;

  // A booking records the declaration its buyer actually ticked. The form
  // sends the version it displayed; if the wording changed in the console
  // since the page loaded, the buyer has to read the new text first.
  const settings = await getSettings();
  const shownVersion = (body as { consentVersion?: unknown }).consentVersion;
  if (shownVersion !== settings.consentVersion) {
    const message =
      "The declaration has just been updated. Please read it again and tick the box.";
    return NextResponse.json(
      { error: message, errors: { terms: message }, code: "terms_changed" },
      { status: 409 }
    );
  }

  let hold: { id: number; reference: string };
  try {
    hold = await createPendingBooking(
      booking,
      { version: settings.consentVersion, text: settings.consentText },
      now
    );
  } catch (error) {
    if (error instanceof SlotFullError) {
      const message = "That slot has just filled up. Please pick another time.";
      return NextResponse.json(
        { error: message, errors: { slot: message }, code: "slot_full" },
        { status: 409 }
      );
    }
    console.error("[us-booking] Couldn't hold a slot:", error);
    return NextResponse.json(
      { error: "We couldn't reserve your slot. Please try again." },
      { status: 500 }
    );
  }

  const siteUrl = getSiteUrl();
  const successUrl = (sessionId: string) =>
    `${siteUrl}/urban-sprint/book/success?session_id=${sessionId}`;

  // Local development without Stripe: confirm the booking directly so the
  // whole flow — hold, confirmation, success page — can still be exercised.
  // Never true on a deployed build (see isPaymentsBypassEnabled).
  if (isPaymentsBypassEnabled()) {
    const sessionId = `cs_bypass_${randomUUID()}`;
    try {
      await attachCheckoutSession(hold.id, sessionId);
      await completeTeamBooking(sessionId, {
        paymentIntentId: null,
        payerEmail: process.env.PAYMENTS_TEST_EMAIL ?? booking.participants[0].email,
        payerName: booking.participants[0].fullName,
        payerPhone: booking.participants[0].phone,
      });
    } catch (error) {
      console.error("[us-booking] Bypass booking failed:", error);
      await releaseBooking({ id: hold.id }, "expired").catch(() => undefined);
      return NextResponse.json(
        { error: "We couldn't complete your test booking. Please try again." },
        { status: 500 }
      );
    }
    return NextResponse.json({ url: successUrl(sessionId) });
  }

  const slot = `${formatBookingDate(booking.date)}, ${formatSlotTime(booking.time)}`;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      locale: "auto",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: BOOKING_CURRENCY,
            unit_amount: TEAM_PRICE_CENTS,
            product_data: {
              name: `Urban Sprint team — ${slot}`,
              description: `${booking.teamName} · ${booking.participants.length} people · includes a Traveloop Platinum Pass for each`,
            },
          },
        },
      ],
      metadata: { kind: TEAM_BOOKING_KIND, bookingId: String(hold.id), reference: hold.reference },
      payment_intent_data: {
        metadata: { kind: TEAM_BOOKING_KIND, reference: hold.reference },
        description: `Urban Sprint team ${hold.reference} — ${slot}`,
      },
      // Closes the checkout before the hold lapses, so nobody can pay for a
      // place that has already gone back on sale.
      expires_at: Math.floor(now.getTime() / 1000) + CHECKOUT_SESSION_MINUTES * 60,
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      success_url: successUrl("{CHECKOUT_SESSION_ID}"),
      // The reference lets the booking page give the place back straight
      // away instead of holding it until the checkout times out.
      cancel_url: `${siteUrl}/urban-sprint/book?cancelled=${hold.reference}`,
    });

    if (!session.url) throw new Error("Stripe returned a session without a checkout URL.");

    // If this write fails the webhook can still find the booking through the
    // bookingId in the session metadata.
    await attachCheckoutSession(hold.id, session.id).catch((error) =>
      console.error(`[us-booking] Couldn't link ${hold.reference} to ${session.id}:`, error)
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[us-booking] Failed to create Stripe Checkout Session:", error);
    await releaseBooking({ id: hold.id }, "expired").catch(() => undefined);

    const isConfigError =
      error instanceof Stripe.errors.StripeAuthenticationError ||
      (error instanceof Error && error.message.includes("STRIPE_SECRET_KEY"));

    return NextResponse.json(
      {
        error: isConfigError
          ? "Online payment isn't available right now. Please try again later."
          : "We couldn't start the payment. Please try again.",
      },
      { status: isConfigError ? 503 : 500 }
    );
  }
}
