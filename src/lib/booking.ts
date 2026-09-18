import {
  BOOKING_LEAD_DAYS,
  CANCELLATION_CUTOFF_HOURS,
  EXPERIENCE_CURRENCY,
  experiences,
  getExperience,
  getEntitlement,
  listSlotsByDate,
  packAvailable,
  quoteBooking,
  resolveBookingWindow,
  sessionInstant,
  slotValue,
  type Experience,
} from "@/app/data/experiences";
import type { StoredOrder } from "./orders-db";
import type { NewBooking, StoredBooking } from "./experience-bookings-db";

/**
 * Turns a submitted booking form into a row we're willing to write.
 *
 * Every constraint the UI enforces is re-checked here, because the form is
 * just a suggestion: a POST straight at the Server Action can claim any pass,
 * any slot, any headcount. In particular the *price is recomputed* from the
 * catalogue rather than read from the request, and access is decided by the
 * tier on the order the customer actually owns.
 */

export type BookingParseResult =
  | { ok: true; value: NewBooking; experience: Experience }
  | { ok: false; error: string };

const MAX_NOTES_LENGTH = 500;

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function count(formData: FormData, name: string): number {
  const value = Number(text(formData, name));
  return Number.isInteger(value) ? value : NaN;
}

export function parseBookingForm(
  formData: FormData,
  context: { userId: string; orders: StoredOrder[] }
): BookingParseResult {
  const experience = getExperience(text(formData, "experienceKey"));
  if (!experience) {
    return { ok: false, error: "We couldn't find that experience." };
  }

  // The pass is chosen by the customer (they may hold several), so confirm the
  // order is theirs before trusting the tier written on it.
  const order = context.orders.find(
    (candidate) => candidate.sessionId === text(formData, "orderSessionId")
  );
  if (!order) {
    return { ok: false, error: "Please choose which pass you're booking with." };
  }

  const entitlement = getEntitlement(order.passKey, experience);
  if (!entitlement.entitled) {
    return {
      ok: false,
      error: `Your ${order.passName} Pass doesn't include the ${experience.name}.`,
    };
  }

  // --- Slot ---------------------------------------------------------------
  const window = resolveBookingWindow(order);
  const slotsByDate = listSlotsByDate(experience, window);

  const submittedSlot = text(formData, "slot");
  const slot = Object.values(slotsByDate)
    .flat()
    .find((candidate) => candidate.value === submittedSlot);

  if (!slot) {
    return {
      ok: false,
      error: `That session isn't available. Sessions must be booked at least ${BOOKING_LEAD_DAYS} days ahead${
        order.arrivalDate && order.departureDate ? " and within your trip dates" : ""
      }.`,
    };
  }

  // --- Headcount ----------------------------------------------------------
  const participants = count(formData, "participants");
  const { min, max } = experience.participants;

  if (Number.isNaN(participants) || participants < min || participants > max) {
    return {
      ok: false,
      error: `Please choose between ${min} and ${max} participants.`,
    };
  }

  const childrenCount = experience.freeChildAgeUnder ? count(formData, "childrenCount") : 0;
  if (Number.isNaN(childrenCount) || childrenCount < 0 || childrenCount > max) {
    return { ok: false, error: "Please enter a valid number of children." };
  }

  // --- Package ------------------------------------------------------------
  let packageKey: string | null = null;
  if (experience.pricing.mode === "packages") {
    const submitted = text(formData, "packageKey");
    const option = experience.pricing.options.find((o) => o.key === submitted);
    if (!option) {
      return { ok: false, error: "Please choose a photo package." };
    }
    packageKey = option.key;
  } else if (experience.pricing.mode === "per-person" && experience.pricing.groupPack) {
    // A group pack is opt-in, so anything other than its own key — including
    // nothing at all — is the plain per-person rate rather than an error.
    const { groupPack } = experience.pricing;
    const wantsPack = text(formData, "packageKey") === groupPack.key;

    // The form hides the pack below its minimum, but a POST straight at the
    // action can still claim it — and claiming it for two people would buy a
    // four-person price. Refuse rather than silently reprice, so the customer
    // is never charged something other than what they agreed to.
    if (wantsPack && !packAvailable(groupPack, participants)) {
      return {
        ok: false,
        error: `The ${groupPack.label} needs at least ${groupPack.minParticipants} participants.`,
      };
    }

    packageKey = wantsPack ? groupPack.key : null;
  }

  // --- Location -----------------------------------------------------------
  let location: string | null = experience.venue;
  if (experience.locationOptions) {
    const submitted = text(formData, "location");
    const option = experience.locationOptions.find((o) => o.value === submitted);
    if (!option) {
      return { ok: false, error: "Please choose a location." };
    }
    if (option.comingSoon) {
      return { ok: false, error: `${option.label} isn't available yet.` };
    }
    location = option.value;
  }

  const customerNotes = text(formData, "customerNotes").slice(0, MAX_NOTES_LENGTH) || null;

  const quote = quoteBooking(experience, entitlement.discountPercent, {
    participants,
    packageKey,
  });

  return {
    ok: true,
    experience,
    value: {
      userId: context.userId,
      orderSessionId: order.sessionId,
      passKey: order.passKey,
      experienceKey: experience.key,
      experienceName: experience.name,
      sessionDate: slot.date,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      participants,
      childrenCount,
      packageKey,
      location,
      quotedAmountCents: quote.totalCents,
      currency: EXPERIENCE_CURRENCY,
      discountPercent: entitlement.discountPercent,
      customerNotes,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Which of a customer's passes to book with                           */
/* ------------------------------------------------------------------ */

export type ExperienceAccess = {
  experience: Experience;
  /** The customer's pass that unlocks this experience best, or null if none does. */
  order: StoredOrder | null;
  discountPercent: number;
};

/**
 * Picks the pass to book an experience with when the customer holds more than
 * one — the deepest discount wins, since that's unambiguously the offer they'd
 * choose. `orders` arrives newest-first, so an equal discount keeps the most
 * recent pass. The customer can still override the choice on the booking page.
 */
export function bestOrderFor(experience: Experience, orders: StoredOrder[]): StoredOrder | null {
  let best: StoredOrder | null = null;
  let bestDiscount = -1;

  for (const order of orders) {
    const entitlement = getEntitlement(order.passKey, experience);
    if (entitlement.entitled && entitlement.discountPercent > bestDiscount) {
      best = order;
      bestDiscount = entitlement.discountPercent;
    }
  }

  return best;
}

/** Every experience in catalogue order, annotated with how this customer can book it. */
export function accessForExperiences(orders: StoredOrder[]): ExperienceAccess[] {
  return experiences.map((experience) => {
    const order = bestOrderFor(experience, orders);
    return {
      experience,
      order,
      discountPercent: order ? getEntitlement(order.passKey, experience).discountPercent : 0,
    };
  });
}

/**
 * Whether the customer can still cancel this booking themselves.
 *
 * Inside the cutoff the venue, troupe or photographer is already committed, so
 * cancelling becomes a conversation with the team rather than a button.
 */
export function isCancellableByCustomer(
  booking: Pick<StoredBooking, "status" | "sessionDate" | "startMinutes">,
  now: Date = new Date()
): boolean {
  if (booking.status !== "pending" && booking.status !== "confirmed") return false;

  const startsAt = sessionInstant(booking.sessionDate, booking.startMinutes);
  return startsAt.getTime() - now.getTime() > CANCELLATION_CUTOFF_HOURS * 60 * 60_000;
}

/** Whether the session has already happened — drives "Upcoming" vs "Past" in the portal. */
export function isPastSession(
  booking: Pick<StoredBooking, "sessionDate" | "endMinutes">,
  now: Date = new Date()
): boolean {
  return sessionInstant(booking.sessionDate, booking.endMinutes).getTime() < now.getTime();
}

/** Re-exported so callers can build a slot value without reaching into the catalogue. */
export { slotValue };
