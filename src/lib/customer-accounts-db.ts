import { randomBytes } from "node:crypto";
import { getSupabase } from "./supabase";
import { backfillOrdersForEmail } from "./orders-db";

/**
 * Admin-side view of a customer: their Supabase Auth record joined with the
 * profile captured at checkout and a count of what they've bought and booked.
 *
 * "Customer" deliberately excludes the ADMIN_LOGIN_EMAIL account — that one is
 * the operator's own login, not a customer record, and letting the admin panel
 * edit or delete it is a straightforward way to lock yourself out.
 */
export type CustomerAccount = {
  userId: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  /** From customer_profiles — null until they've completed a purchase. */
  fullName: string | null;
  nationality: string | null;
  orderCount: number;
  bookingCount: number;
};

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`An account already exists for ${email}.`);
    this.name = "DuplicateEmailError";
  }
}

/** Matches the generator used at checkout fulfilment, so issued passwords look alike. */
export function generatePassword(): string {
  return randomBytes(9).toString("base64url");
}

function isAdminEmail(email: string | undefined): boolean {
  const adminEmail = process.env.ADMIN_LOGIN_EMAIL;
  return Boolean(adminEmail && email && email.toLowerCase() === adminEmail.toLowerCase());
}

type AuthUser = { id: string; email?: string; created_at: string; last_sign_in_at?: string | null };

/** listUsers is paged; the admin list needs all of them, so walk to the end. */
async function listAllAuthUsers(): Promise<AuthUser[]> {
  const db = getSupabase();
  const perPage = 200;
  const users: AuthUser[] = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Failed to list accounts: ${error.message}`);

    users.push(...(data.users as AuthUser[]));
    if (data.users.length < perPage) break;
  }

  return users;
}

/**
 * Every customer account, newest first.
 *
 * Profiles, orders and bookings are each fetched once and joined in memory
 * rather than queried per user — the same trade the bookings admin makes, and
 * the row counts here are in the same order of magnitude.
 */
export async function listCustomerAccounts(): Promise<CustomerAccount[]> {
  const db = getSupabase();

  const [users, profiles, orders, bookings, sprintProfiles] = await Promise.all([
    listAllAuthUsers(),
    db.from("customer_profiles").select("user_id, full_name, nationality"),
    db.from("orders").select("user_id").not("user_id", "is", null),
    db.from("experience_bookings").select("user_id"),
    db.from("us_profiles").select("user_id"),
  ]);

  for (const [label, result] of [
    ["profiles", profiles],
    ["orders", orders],
    ["bookings", bookings],
  ] as const) {
    if (result.error) throw new Error(`Failed to load ${label}: ${result.error.message}`);
  }

  const profileByUser = new Map(
    (profiles.data ?? []).map((p) => [p.user_id as string, p as { full_name: string | null; nationality: string | null }])
  );

  const tally = (rows: { user_id: string | null }[] | null) => {
    const counts = new Map<string, number>();
    for (const row of rows ?? []) {
      if (row.user_id) counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
    }
    return counts;
  };

  const orderCounts = tally(orders.data as { user_id: string | null }[] | null);
  const bookingCounts = tally(bookings.data as { user_id: string | null }[] | null);

  // Urban Sprint accounts live in the same auth.users table. One that has never
  // touched Traveloop (no profile, order or booking) is staff or a player, not
  // a customer. A missing us_ table just means the extension isn't installed.
  if (sprintProfiles.error) {
    console.error("[admin] Could not load us_profiles:", sprintProfiles.error.message);
  }
  const sprintOnly = new Set(
    (sprintProfiles.data ?? [])
      .map((p) => p.user_id as string)
      .filter(
        (id) => !profileByUser.has(id) && !orderCounts.has(id) && !bookingCounts.has(id)
      )
  );

  return users
    .filter((user) => !isAdminEmail(user.email) && !sprintOnly.has(user.id))
    .map((user) => ({
      userId: user.id,
      email: user.email ?? "—",
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      fullName: profileByUser.get(user.id)?.full_name ?? null,
      nationality: profileByUser.get(user.id)?.nationality ?? null,
      orderCount: orderCounts.get(user.id) ?? 0,
      bookingCount: bookingCounts.get(user.id) ?? 0,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * One customer, or null for an unknown id — or for the admin's own account.
 *
 * A malformed id (a hand-edited URL) makes getUserById throw rather than
 * return an error, so this swallows it into the same "not found" answer the
 * caller already handles.
 */
export async function getCustomerAccount(userId: string): Promise<CustomerAccount | null> {
  const db = getSupabase();

  let email: string | undefined;
  try {
    const { data, error } = await db.auth.admin.getUserById(userId);
    if (error || !data.user) return null;
    email = data.user.email;
  } catch {
    return null;
  }

  if (isAdminEmail(email)) return null;

  const all = await listCustomerAccounts();
  return all.find((account) => account.userId === userId) ?? null;
}

/**
 * Creates a customer account by hand — for a walk-in or phone booking that
 * never went through Stripe checkout.
 *
 * Any existing orders already paid for under this email are linked to the new
 * account, the same way fulfilment does it, so the customer sees their history
 * the first time they sign in.
 */
export async function createCustomerAccount(input: {
  email: string;
  password: string;
  fullName?: string | null;
}): Promise<{ userId: string }> {
  const db = getSupabase();

  const { data, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: input.fullName ? { name: input.fullName } : undefined,
  });

  if (error || !data.user) {
    // Supabase reports the collision differently across versions; match loosely.
    if (/already|exists|registered|duplicate/i.test(error?.message ?? "")) {
      throw new DuplicateEmailError(input.email);
    }
    throw new Error(`Failed to create account: ${error?.message ?? "unknown error"}`);
  }

  if (input.fullName) {
    const { error: profileError } = await db
      .from("customer_profiles")
      .upsert({ user_id: data.user.id, full_name: input.fullName }, { onConflict: "user_id" });

    // A missing profile row is recoverable — the account itself is what matters.
    if (profileError) {
      console.error(`[admin] Created ${input.email} but profile write failed:`, profileError);
    }
  }

  await backfillOrdersForEmail(input.email, data.user.id);

  return { userId: data.user.id };
}

/** Changes the sign-in email. Returns false if the account isn't a customer. */
export async function updateCustomerEmail(userId: string, email: string): Promise<void> {
  const db = getSupabase();

  const { error } = await db.auth.admin.updateUserById(userId, { email, email_confirm: true });

  if (error) {
    if (/already|exists|registered|duplicate/i.test(error.message)) {
      throw new DuplicateEmailError(email);
    }
    throw new Error(`Failed to update email: ${error.message}`);
  }

  // Orders are matched to accounts by email, so a change can strand old ones.
  await backfillOrdersForEmail(email, userId);
}

export async function setCustomerPassword(userId: string, password: string): Promise<void> {
  const db = getSupabase();

  const { error } = await db.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(`Failed to set password: ${error.message}`);
}

/**
 * What a delete would take with it, so the confirmation can state real numbers
 * instead of a generic warning.
 *
 * Bookings and the profile cascade from the auth user; orders survive with
 * their user_id nulled, so the sale and its invoice are never destroyed.
 */
export async function getDeletionImpact(
  userId: string
): Promise<{ bookings: number; orders: number }> {
  const db = getSupabase();

  const [bookings, orders] = await Promise.all([
    db.from("experience_bookings").select("*", { count: "exact", head: true }).eq("user_id", userId),
    db.from("orders").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  return { bookings: bookings.count ?? 0, orders: orders.count ?? 0 };
}

export async function deleteCustomerAccount(userId: string): Promise<void> {
  const db = getSupabase();

  const { data, error: lookupError } = await db.auth.admin.getUserById(userId);
  if (lookupError || !data.user) throw new Error("That account no longer exists.");
  if (isAdminEmail(data.user.email)) {
    throw new Error("The admin login can't be deleted from here.");
  }

  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Failed to delete account: ${error.message}`);
}
