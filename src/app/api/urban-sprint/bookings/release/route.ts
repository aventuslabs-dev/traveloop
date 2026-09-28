import { NextResponse } from "next/server";
import { getStripe, isPaymentsBypassEnabled } from "@/lib/stripe";
import { getBookingByReference, releaseBooking } from "@/lib/urban-sprint/bookings-db";

export const runtime = "nodejs";

const REFERENCE = /^US-[A-Z0-9]{8}$/;

/**
 * Gives a place back when the buyer leaves Stripe's page without paying.
 *
 * Without this the place stays held until the checkout times out, and the
 * buyer coming back to fix a typo can find their own abandoned hold is what
 * made the slot sold out.
 *
 * Stripe decides, not this route: the checkout is expired first, and Stripe
 * refuses to expire one that has been paid. So a reference in the wrong hands
 * can at most close an unpaid checkout — never undo a booking.
 */
export async function POST(request: Request) {
  let reference: unknown;
  try {
    ({ reference } = (await request.json()) as { reference?: unknown });
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  if (typeof reference !== "string" || !REFERENCE.test(reference)) {
    return NextResponse.json({ released: false });
  }

  try {
    const booking = await getBookingByReference(reference);
    if (!booking || booking.status !== "pending") {
      return NextResponse.json({ released: false });
    }

    const sessionId = booking.stripeSessionId;
    if (sessionId && !isPaymentsBypassEnabled()) {
      const stripe = getStripe();
      try {
        await stripe.checkout.sessions.expire(sessionId);
      } catch {
        // Already expired is fine; anything else (complete, or processing a
        // payment) means the place is no longer ours to give back.
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.status !== "expired") return NextResponse.json({ released: false });
      }
    }

    await releaseBooking({ id: booking.id }, "expired");
    return NextResponse.json({ released: true });
  } catch (error) {
    console.error(`[us-booking] Couldn't release ${reference}:`, error);
    return NextResponse.json({ released: false }, { status: 500 });
  }
}
