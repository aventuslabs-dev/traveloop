"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateCustomerProfile } from "@/lib/customer-profile-db";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/account/login");
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
    redirect("/account/login");
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
    redirect("/account/details?profileError=1");
  }

  redirect("/account/details?profileUpdated=1");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || password.length < 8) {
    redirect("/account/details?passwordError=short");
  }

  if (password !== confirmPassword) {
    redirect("/account/details?passwordError=mismatch");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect("/account/details?passwordError=1");
  }

  redirect("/account/details?passwordUpdated=1");
}
