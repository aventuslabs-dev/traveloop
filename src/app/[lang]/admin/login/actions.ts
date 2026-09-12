"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ID = "admin";

export async function login(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const adminEmail = process.env.ADMIN_LOGIN_EMAIL;
  if (!adminEmail) {
    throw new Error("ADMIN_LOGIN_EMAIL must be set.");
  }

  if (id !== ADMIN_ID || !password) {
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
