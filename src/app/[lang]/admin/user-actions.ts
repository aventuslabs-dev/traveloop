"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-auth";
import { updateCustomerProfile } from "@/lib/customer-profile-db";
import {
  DuplicateEmailError,
  createCustomerAccount,
  deleteCustomerAccount,
  generatePassword,
  getCustomerAccount,
  setCustomerPassword,
  updateCustomerEmail,
} from "@/lib/customer-accounts-db";

/**
 * The admin area is gated by a Supabase session in proxy.ts, but Server Actions
 * accept direct POSTs and skip it — so every action here re-checks, the same way
 * booking-actions.ts does.
 */
async function requireAdmin() {
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) {
    redirect("/admin/login");
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;

export type CustomerFormState = {
  status: "idle" | "created" | "error";
  error?: string;
  /** Shown once, immediately after creation — never stored or re-displayed. */
  created?: { email: string; password: string };
};

export async function createCustomer(
  _prev: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim() || null;
  const supplied = String(formData.get("password") ?? "").trim();

  if (!EMAIL_RE.test(email)) {
    return { status: "error", error: "Enter a valid email address." };
  }
  if (supplied && supplied.length < MIN_PASSWORD) {
    return { status: "error", error: `Password must be at least ${MIN_PASSWORD} characters.` };
  }

  const password = supplied || generatePassword();

  try {
    await createCustomerAccount({ email, password, fullName });
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return { status: "error", error: error.message };
    }
    console.error("[admin] Failed to create customer:", error);
    return { status: "error", error: "Couldn't create that account. Please try again." };
  }

  revalidatePath("/admin/users");
  return { status: "created", created: { email, password } };
}

/** Saves the sign-in email and the checkout profile fields from the detail page. */
export async function saveCustomer(formData: FormData) {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const account = await getCustomerAccount(userId);
  if (!account) {
    redirect("/admin/users?error=missing");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    redirect(`/admin/users/${userId}?error=email`);
  }

  const text = (key: string) => String(formData.get(key) ?? "").trim() || null;
  // "Other" reopens a free-text field; store what was typed, not the literal "Other".
  const pick = (key: string) =>
    formData.get(key) === "Other" ? text(`${key}Other`) : text(key);

  try {
    if (email !== account.email) {
      await updateCustomerEmail(userId, email);
    }

    await updateCustomerProfile(userId, {
      fullName: text("fullName"),
      nationality: pick("nationality"),
      travelDocumentType: text("travelDocumentType"),
      travelDocumentNumber: text("travelDocumentNumber"),
      address: text("address"),
      emergencyContactName: text("emergencyContactName"),
      emergencyContactPhone: text("emergencyContactPhone"),
      emergencyContactRelationship: pick("emergencyContactRelationship"),
    });
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      redirect(`/admin/users/${userId}?error=duplicate`);
    }
    console.error(`[admin] Failed to save customer ${userId}:`, error);
    redirect(`/admin/users/${userId}?error=save`);
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  redirect(`/admin/users/${userId}?saved=1`);
}

export type PasswordFormState = {
  status: "idle" | "reset" | "error";
  error?: string;
  password?: string;
};

/** Issues a new password and hands it back once for the operator to pass on. */
export async function resetCustomerPassword(
  _prev: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  if (!(await getCustomerAccount(userId))) {
    return { status: "error", error: "That account no longer exists." };
  }

  const supplied = String(formData.get("password") ?? "").trim();
  if (supplied && supplied.length < MIN_PASSWORD) {
    return { status: "error", error: `Password must be at least ${MIN_PASSWORD} characters.` };
  }

  const password = supplied || generatePassword();

  try {
    await setCustomerPassword(userId, password);
  } catch (error) {
    console.error(`[admin] Failed to reset password for ${userId}:`, error);
    return { status: "error", error: "Couldn't set that password. Please try again." };
  }

  return { status: "reset", password };
}

export async function deleteCustomer(formData: FormData) {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const account = await getCustomerAccount(userId);
  if (!account) {
    redirect("/admin/users?error=missing");
  }

  // The detail page prints the exact email next to this box; requiring it back
  // makes an accidental delete of the wrong row effectively impossible.
  const confirmation = String(formData.get("confirmEmail") ?? "").trim().toLowerCase();
  if (confirmation !== account.email.toLowerCase()) {
    redirect(`/admin/users/${userId}?error=confirm`);
  }

  try {
    await deleteCustomerAccount(userId);
  } catch (error) {
    console.error(`[admin] Failed to delete customer ${userId}:`, error);
    redirect(`/admin/users/${userId}?error=delete`);
  }

  revalidatePath("/admin/users");
  redirect(`/admin/users?deleted=${encodeURIComponent(account.email)}`);
}
