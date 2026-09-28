import { cache } from "react";
import { notFound } from "next/navigation";
import { getBookingByReference } from "@/lib/urban-sprint/bookings-db";
import { readTeamLinkToken } from "@/lib/urban-sprint/team-link";
import { getTeamForBooking } from "@/lib/urban-sprint/teams-db";

/** A team with no colour of its own wears the race's red (--us-accent). */
const FALLBACK_COLOR = "#e8323f";

/**
 * The team a link opens, or a 404. A token that doesn't verify, or a booking
 * that isn't paid, looks exactly like a page that doesn't exist — the link
 * reveals nothing about which Booking IDs are real.
 *
 * Cached per request, so the layout and the page share one lookup.
 */
export const loadTeamLink = cache(async (token: string) => {
  const reference = readTeamLinkToken(decodeURIComponent(token));
  if (!reference) notFound();

  // Both keyed by the reference the token carries, so they go together
  // rather than one after the other. The team is null when an organiser has
  // taken it out of the station game; the page still shows the race and the
  // result.
  const [booking, team] = await Promise.all([
    getBookingByReference(reference),
    getTeamForBooking(reference),
  ]);
  if (!booking || booking.status !== "paid") notFound();

  return { base: `/urban-sprint/t/${token}`, booking, team, color: team?.color ?? FALLBACK_COLOR };
});
