"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrdersByUserId } from "@/lib/orders-db";
import { parseBookingForm, isCancellableByCustomer } from "@/lib/booking";
import {
  insertBooking,
  updateBookingStatus,
  getBookingByReference,
  DuplicateBookingError,
  SlotFullError,
} from "@/lib/experience-bookings-db";
import { sendBookingRequestEmail, sendBookingAdminAlert } from "@/lib/email";

export type BookingFormState = { error: string | null };

/**
 * Places a cultural-experience booking.
 *
 * Server Actions are reachable by direct POST, so this re-authenticates,
 * re-loads the customer's real orders, and hands both to `parseBookingForm` —
 * which is where entitlement, slot validity and the price are decided. Nothing
 * the browser sent is trusted beyond being a set of choices to validate.
 */
export async function createBooking(
  _prevState: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login");
  }

  const orders = await getOrdersByUserId(user.id);
  const parsed = parseBookingForm(formData, { userId: user.id, orders });

  if (!parsed.ok) {
    return { error: parsed.error };
  }

  let booking;
  try {
    booking = await insertBooking(parsed.value);
  } catch (error) {
    if (error instanceof DuplicateBookingError) {
      return {
        error: "You already have a booking for this experience. Check your bookings below.",
      };
    }
    if (error instanceof SlotFullError) {
      return { error: "That session just filled up. Please choose another date or time." };
    }
    console.error("[bookings] Failed to create booking:", error);
    return { error: "We couldn't save your booking. Please try again in a moment." };
  }

  // The booking exists and is the record that matters — a mail hiccup must not
  // surface to the customer as a failed booking.
  const recipient =
    orders.find((order) => order.sessionId === booking.orderSessionId)?.customerEmail ??
    user.email ??
    null;

  try {
    await Promise.all([
      sendBookingRequestEmail(booking, recipient),
      sendBookingAdminAlert(booking, recipient),
    ]);
  } catch (error) {
    console.error(`[bookings] Failed to send email for ${booking.reference}:`, error);
  }

  revalidatePath("/account/bookings");
  redirect(`/account/bookings?booked=${booking.reference}`);
}

/** Customer-initiated cancellation, allowed up to the cutoff before the session. */
export async function cancelBooking(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login");
  }

  const reference = String(formData.get("reference") ?? "").trim();
  const booking = await getBookingByReference(reference);

  // Ownership is checked here *and* passed to the update as a filter, so a
  // reference belonging to someone else can neither be read back nor written.
  if (!booking || booking.userId !== user.id) {
    redirect("/account/bookings?cancelError=1");
  }

  if (!isCancellableByCustomer(booking)) {
    redirect("/account/bookings?cancelError=late");
  }

  try {
    await updateBookingStatus(reference, "cancelled", { expectedUserId: user.id });
  } catch (error) {
    console.error(`[bookings] Failed to cancel ${reference}:`, error);
    redirect("/account/bookings?cancelError=1");
  }

  revalidatePath("/account/bookings");
  redirect(`/account/bookings?cancelled=${reference}`);
}
