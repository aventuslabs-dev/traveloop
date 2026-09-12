"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrderBySessionId } from "@/lib/orders-db";
import { isBookingStatus, updateBookingStatus } from "@/lib/experience-bookings-db";
import { sendBookingStatusEmail } from "@/lib/email";
import { isAdminUser } from "@/lib/admin-auth";

/**
 * Moves a booking through its lifecycle from the admin table.
 *
 * The admin area is gated by a Supabase session (see proxy.ts), but Server
 * Actions accept direct POSTs, so the session is checked here too rather than
 * relying on the page that rendered the form.
 */
export async function setBookingStatus(formData: FormData) {
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) {
    redirect("/admin/login");
  }

  const reference = String(formData.get("reference") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const adminNotes = String(formData.get("adminNotes") ?? "").trim() || null;

  if (!isBookingStatus(status)) {
    redirect("/admin/bookings?error=1");
  }

  let booking;
  try {
    booking = await updateBookingStatus(reference, status, { adminNotes });
  } catch (error) {
    console.error(`[admin] Failed to update booking ${reference}:`, error);
    redirect("/admin/bookings?error=1");
  }

  if (!booking) {
    redirect("/admin/bookings?error=1");
  }

  // Only the two states the customer needs to hear about are emailed;
  // "completed" is bookkeeping after the fact.
  if (booking.status === "confirmed" || booking.status === "cancelled") {
    try {
      const order = await getOrderBySessionId(booking.orderSessionId);
      await sendBookingStatusEmail(booking, order?.customerEmail ?? null);
    } catch (error) {
      console.error(`[admin] Failed to email status for ${reference}:`, error);
    }
  }

  revalidatePath("/admin/bookings");
  redirect(`/admin/bookings?updated=${booking.reference}`);
}
