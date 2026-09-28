"use server";

import { redirect } from "next/navigation";
import { normalizeBookingId } from "@/lib/urban-sprint/booking-config";
import { getBookingByReference } from "@/lib/urban-sprint/bookings-db";
import { teamLinkPath } from "@/lib/urban-sprint/team-link";

export type FindTeamState = {
  error?: string;
};

/**
 * The landing page's "Find my team": a Booking ID in, the team's page out.
 *
 * Only a paid booking has a team page (see t/[token]/load.ts), so anything
 * else — a typo, an ID that never existed, a checkout abandoned and cleared —
 * is answered the same way: that Booking ID doesn't exist. The one exception
 * is a payment still settling (FPX and the like), where "doesn't exist" would
 * send a buyer who has paid into a panic.
 */
export async function findTeam(_prev: FindTeamState, formData: FormData): Promise<FindTeamState> {
  const typed = String(formData.get("id") ?? "").trim();
  if (!typed) return { error: "Enter your Booking ID." };

  const reference = normalizeBookingId(typed);
  const booking = reference ? await getBookingByReference(reference) : null;

  if (booking?.status === "processing") {
    return {
      error: `Booking ${booking.reference} is still waiting for its payment to clear. Your team page opens as soon as it does.`,
    };
  }

  if (!booking || booking.status !== "paid") {
    return {
      error: `Booking ID “${typed.toUpperCase()}” doesn’t exist. Check your confirmation email — it looks like US-ABCD2345.`,
    };
  }

  redirect(teamLinkPath(booking.reference));
}
