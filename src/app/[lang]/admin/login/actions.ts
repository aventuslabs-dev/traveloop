"use server";

import { redirect } from "next/navigation";
import { isOperatorEmail, loginEmailFor } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const adminEmail = process.env.ADMIN_LOGIN_EMAIL;
  if (!adminEmail) {
    throw new Error("ADMIN_LOGIN_EMAIL must be set.");
  }

  // "admin", or the operator's email in full. Nobody else signs in here.
  if (!isOperatorEmail(loginEmailFor(id)) || !password) {
    redirect("/admin/login?error=1");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password,
  });

  if (error) {
    redirect("/admin/login?error=1");
  }

  redirect("/admin");
}
