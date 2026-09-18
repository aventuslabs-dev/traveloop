import { randomBytes } from "crypto";
import { getSupabase } from "./supabase";
import { findUserIdByEmail, backfillOrdersForEmail } from "./orders-db";

function generatePassword(): string {
  return randomBytes(9).toString("base64url");
}

export type CustomerAccountResult =
  | { userId: string; isNew: false }
  | { userId: string; isNew: true; password: string }
  | { userId: null; isNew: false };

/**
 * Finds the Supabase Auth account already linked to a previous order for
 * this email, or creates one (with an auto-generated password) on the
 * buyer's first purchase. Newly created accounts get any older, unlinked
 * orders for the same email backfilled onto them.
 */
export async function findOrCreateCustomerAccount(
  email: string,
  name: string | null
): Promise<CustomerAccountResult> {
  const existingUserId = await findUserIdByEmail(email);
  if (existingUserId) {
    return { userId: existingUserId, isNew: false };
  }

  const password = generatePassword();
  const supabase = getSupabase();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: name ? { name } : undefined,
  });

  if (error || !data.user) {
    /**
     * Now that the lookup above asks auth.users rather than the orders table,
     * reaching here means a genuine race: two near-simultaneous first
     * purchases for the same email both missed it, and one lost.
     *
     * Look once more before giving up. The winner's account exists by now, and
     * returning null instead would store this order with no `user_id` — absent
     * from the buyer's portal, with no welcome email and no profile saved.
     * That used to be the routine outcome for anyone who already had an
     * account without ever having ordered.
     */
    const racedUserId = await findUserIdByEmail(email);
    if (racedUserId) {
      return { userId: racedUserId, isNew: false };
    }

    console.error(`[customer-account] Failed to create account for ${email}:`, error);
    return { userId: null, isNew: false };
  }

  await backfillOrdersForEmail(email, data.user.id);

  return { userId: data.user.id, isNew: true, password };
}
