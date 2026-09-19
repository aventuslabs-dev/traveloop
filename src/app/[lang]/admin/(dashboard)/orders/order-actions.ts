"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-auth";
import {
  getOrderBySessionId,
  markConfirmationSent,
  recordConfirmationFailure,
} from "@/lib/orders-db";
import { getOrderItemsFromRegistrations } from "@/lib/pass-registrations-db";
import { sendOrderConfirmationEmail } from "@/lib/email";

/**
 * The admin area is gated by a Supabase session in proxy.ts, but Server Actions
 * accept direct POSTs and skip it — so every action here re-checks, the same way
 * user-actions.ts does.
 */
async function requireAdmin() {
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) {
    redirect("/admin/login");
  }
}

/**
 * Sends a buyer their receipt again.
 *
 * This is the recovery path for the failure fulfilment deliberately doesn't
 * retry: the payment went through and the order is recorded, but the email
 * never left (Resend was down, the invoice wouldn't render). The order page
 * shows the reason and this puts it right once the cause is gone.
 *
 * Always the plain confirmation, never the welcome variant, even for an
 * account created by that same order: the welcome email hands over a
 * generated password, and by now the customer may have changed it — or never
 * received it, in which case /admin > Customers issues a fresh one.
 */
export async function resendReceipt(formData: FormData) {
  await requireAdmin();

  const sessionId = String(formData.get("sessionId") ?? "");
  const order = await getOrderBySessionId(sessionId);
  if (!order) {
    redirect("/admin?error=missing");
  }
  if (!order.customerEmail) {
    redirect(`/admin/orders/${sessionId}?error=noemail`);
  }

  let failure: string | null = null;
  try {
    // Rebuilt from the stored registrations — the checkout draft that carried
    // them at purchase time is long gone by now.
    const items = await getOrderItemsFromRegistrations(sessionId);
    await sendOrderConfirmationEmail(order, items);
  } catch (error) {
    console.error(`[admin] Failed to resend the receipt for ${sessionId}:`, error);
    failure = error instanceof Error ? error.message : String(error);
  }

  // redirect() works by throwing, so both branches stay outside the try above.
  if (failure) {
    await recordConfirmationFailure(sessionId, failure);
    revalidatePath(`/admin/orders/${sessionId}`);
    redirect(`/admin/orders/${sessionId}?error=send`);
  }

  await markConfirmationSent(sessionId);
  revalidatePath("/admin");
  revalidatePath(`/admin/orders/${sessionId}`);
  redirect(`/admin/orders/${sessionId}?sent=1`);
}
