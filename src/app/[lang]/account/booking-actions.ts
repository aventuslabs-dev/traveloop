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
import { actionLocale, actionPath } from "@/i18n/server";
import { getDictionary } from "@/i18n/dictionaries";
import { bookingErrorMessage } from "@/i18n/errors";

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
    redirect(await actionPath("/account/login"));
  }

  const orders = await getOrdersByUserId(user.id);
  const parsed = parseBookingForm(formData, { userId: user.id, orders });

  // Every message below is read by the person who just submitted the form, so
  // it follows the locale they submitted from rather than the site default.
  const { bookings: t } = await getDictionary(await actionLocale());

  if (!parsed.ok) {
    return { error: bookingErrorMessage(parsed.error, t.errors) };
  }

  let booking;
  try {
    booking = await insertBooking(parsed.value);
  } catch (error) {
    if (error instanceof DuplicateBookingError) {
      return { error: t.errors.duplicate };
    }
    if (error instanceof SlotFullError) {
      return { error: t.errors.slotFull };
    }
    console.error("[bookings] Failed to create booking:", error);
    return { error: t.errors.saveFailed };
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
  redirect(await actionPath(`/account/bookings?booked=${booking.reference}`));
}

/** Customer-initiated cancellation, allowed up to the cutoff before the session. */
export async function cancelBooking(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(await actionPath("/account/login"));
  }

  const reference = String(formData.get("reference") ?? "").trim();
  const booking = await getBookingByReference(reference);

  // Ownership is checked here *and* passed to the update as a filter, so a
  // reference belonging to someone else can neither be read back nor written.
  if (!booking || booking.userId !== user.id) {
    redirect(await actionPath("/account/bookings?cancelError=1"));
  }

  if (!isCancellableByCustomer(booking)) {
    redirect(await actionPath("/account/bookings?cancelError=late"));
  }

  try {
    await updateBookingStatus(reference, "cancelled", { expectedUserId: user.id });
  } catch (error) {
    console.error(`[bookings] Failed to cancel ${reference}:`, error);
    redirect(await actionPath("/account/bookings?cancelError=1"));
  }

  revalidatePath("/account/bookings");
  redirect(await actionPath(`/account/bookings?cancelled=${reference}`));
}
