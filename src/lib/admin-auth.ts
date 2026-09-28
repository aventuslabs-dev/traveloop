import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Customers have their own Supabase Auth accounts, so a signed-in session
 * alone doesn't mean admin — the session's email must match the one
 * ADMIN_LOGIN_EMAIL signs in as. proxy.ts checks this for page navigation;
 * call this too from Server Actions, which accept direct POSTs and skip it.
 *
 * Pass an already-fetched `user` when the caller needs it for other checks
 * too, so this doesn't issue a redundant `getUser()` call.
 */
export async function isAdminUser(
  supabase: SupabaseClient,
  user?: User | null
): Promise<boolean> {
  const resolvedUser =
    user !== undefined
      ? user
      : (
          await supabase.auth.getUser()
        ).data.user;

  return isOperatorEmail(resolvedUser?.email);
}

/**
 * The ID typed on either console's login form in place of the operator's
 * email. The operator signs in once and holds both consoles: Traveloop's, and
 * Urban Sprint's as an Urban Sprint admin (see lib/urban-sprint/auth.ts).
 */
export const ADMIN_LOGIN_ID = "admin";

/** True for the operator's own account — ADMIN_LOGIN_EMAIL, compared without case. */
export function isOperatorEmail(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_LOGIN_EMAIL;
  return Boolean(adminEmail && email && email.toLowerCase() === adminEmail.toLowerCase());
}

/**
 * The email to sign in with for what was typed in a login form's ID box:
 * "admin" (or the operator's email itself) means the operator; anything else
 * is taken as typed.
 */
export function loginEmailFor(typed: string): string {
  const adminEmail = process.env.ADMIN_LOGIN_EMAIL;
  const value = typed.trim();
  if (adminEmail && value.toLowerCase() === ADMIN_LOGIN_ID) return adminEmail;
  return value;
}
