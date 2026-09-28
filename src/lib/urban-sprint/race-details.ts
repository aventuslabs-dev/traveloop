import type { OrderProduct } from "@/lib/fulfillment";
import { getBookingByReference, type StoredTeamBooking } from "./bookings-db";
import { getSettings } from "./settings-db";

/** What a receipt for an Urban Sprint order says about the race itself. */
export type RaceDetails = {
  booking: StoredTeamBooking;
  /** The Rules & Regulations as the console has them at sending. */
  rulesText: string;
};

/**
 * The race behind an order, or null for a Premier Pass order.
 *
 * Read fresh rather than carried on the order: fulfilment and an operator's
 * resend from /admin both need it, and the rules text in particular is still
 * being finalised, so a resend should carry the current wording.
 *
 * Throws when an Urban Sprint order's booking can't be found, so the receipt
 * records a reason instead of going out without the race on it.
 */
export async function raceDetailsFor(order: { product: OrderProduct }): Promise<RaceDetails | null> {
  if (order.product.kind !== "urban_sprint") return null;

  const booking = await getBookingByReference(order.product.reference);
  if (!booking) {
    throw new Error(`Urban Sprint booking ${order.product.reference} couldn't be found for this order.`);
  }

  // getSettings falls back to default wording rather than throwing, so an
  // unreadable settings row never costs a team its confirmation.
  const { rulesText } = await getSettings();
  return { booking, rulesText };
}
