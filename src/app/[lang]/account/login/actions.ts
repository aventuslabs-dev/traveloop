"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { actionPath } from "@/i18n/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // Signing in from /cn must land in /cn — `actionPath` reads the locale off
  // the form's own Referer, so the customer stays in the language they were
  // reading rather than being handed the default one.
  if (!email || !password) {
    redirect(await actionPath("/account/login?error=1"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(await actionPath("/account/login?error=1"));
  }

  redirect(await actionPath("/account"));
}
