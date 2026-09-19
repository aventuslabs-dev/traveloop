"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateCustomerProfile } from "@/lib/customer-profile-db";
import { actionPath } from "@/i18n/server";
import { MIN_PASSWORD_LENGTH } from "./password-rules";

/**
 * Every redirect below goes through `actionPath`, which prefixes the locale
 * the form was submitted from. An unprefixed path would still arrive — the
 * proxy redirects it — but only after a round-trip, and it would land on
 * whichever locale the cookie happens to hold rather than the one the customer
 * is reading.
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(await actionPath("/account/login"));
}

/** Reads a form field as trimmed text, or null when the customer left it blank. */
function field(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "").trim();
  return value === "" ? null : value;
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(await actionPath("/account/login"));
  }

  // "Other" in the dropdown means the real answer is in the adjacent text box.
  const nationality =
    field(formData, "nationality") === "Other"
      ? field(formData, "otherNationality")
      : field(formData, "nationality");

  const relationship =
    field(formData, "emergencyContactRelationship") === "Other"
      ? field(formData, "otherRelationship")
      : field(formData, "emergencyContactRelationship");

  try {
    await updateCustomerProfile(user.id, {
      fullName: field(formData, "fullName"),
      nationality,
      travelDocumentType: field(formData, "travelDocumentType"),
      travelDocumentNumber: field(formData, "travelDocumentNumber"),
      address: field(formData, "address"),
      emergencyContactName: field(formData, "emergencyContactName"),
      emergencyContactPhone: field(formData, "emergencyContactPhone"),
      emergencyContactRelationship: relationship,
    });
  } catch (error) {
    console.error("[account] Failed to update profile:", error);
    redirect(await actionPath("/account/details?profileError=1"));
  }

  redirect(await actionPath("/account/details?profileUpdated=1"));
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    redirect(await actionPath("/account/details?passwordError=short"));
  }

  if (password !== confirmPassword) {
    redirect(await actionPath("/account/details?passwordError=mismatch"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(await actionPath("/account/details?passwordError=1"));
  }

  redirect(await actionPath("/account/details?passwordUpdated=1"));
}
