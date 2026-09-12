"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabase } from "@/lib/supabase";
import { ROLE_HOME } from "@/lib/urban-sprint/auth";
import type { UrbanSprintRole } from "@/lib/urban-sprint/types";

/**
 * Urban Sprint sign-in.
 *
 * Supabase Auth is shared with the Traveloop customer portal, so a successful
 * password check is only half the answer: the account must also hold an active
 * us_profiles row. One that doesn't is signed straight back out rather than
 * left holding a session that reaches nothing — otherwise a Traveloop customer
 * typing their shop password here would land in a half-authenticated state.
 */
export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    redirect(`/urban-sprint/login?error=1${nextParam(next)}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect(`/urban-sprint/login?error=1${nextParam(next)}`);
  }

  const { data: profile } = await getSupabase()
    .from("us_profiles")
    .select("role, active")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    redirect("/urban-sprint/login?error=noaccess");
  }

  const role = profile.role as UrbanSprintRole;
  redirect(destination(role, next));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/urban-sprint");
}

/**
 * Honours a `next` deep link only when it belongs to the role's own area —
 * otherwise a participant following a stale link to the admin console would be
 * bounced again on arrival, which reads as a broken login.
 */
function destination(role: UrbanSprintRole, next: string): string {
  const home = ROLE_HOME[role];
  return next.startsWith(`${home}/`) || next === home ? next : home;
}

function nextParam(next: string): string {
  return next.startsWith("/urban-sprint") ? `&next=${encodeURIComponent(next)}` : "";
}
