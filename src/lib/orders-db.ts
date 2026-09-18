import { getSupabase } from "./supabase";
import type { PassOrder } from "./fulfillment";

/**
 * An order as it exists in the database. `registration` is deliberately
 * dropped: it's an input to fulfilment, whose durable parts are split between
 * customer_profiles and the trip-date columns below.
 */
export type StoredOrder = Omit<PassOrder, "items" | "draftId"> & {
  invoiceNumber: string;
  createdAt: string;
  userId: string | null;
  /** The highest tier in the order — see pass_registrations for the itemised breakdown. */
  passKey: string;
  passName: string;
  quantity: number;
  /** Trip dates from the registration form — null for orders placed before it existed. */
  arrivalDate: string | null;
  departureDate: string | null;
};

type OrderRow = {
  id: number;
  session_id: string;
  pass_key: string;
  pass_name: string;
  quantity: number;
  amount_total: number;
  currency: string;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  payment_intent_id: string | null;
  invoice_number: string;
  created_at: string;
  user_id: string | null;
  arrival_date: string | null;
  departure_date: string | null;
};

function toStoredOrder(row: OrderRow): StoredOrder {
  return {
    sessionId: row.session_id,
    passKey: row.pass_key,
    passName: row.pass_name,
    quantity: row.quantity,
    amountTotal: row.amount_total,
    currency: row.currency,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    paymentIntentId: row.payment_intent_id,
    invoiceNumber: row.invoice_number,
    createdAt: row.created_at,
    userId: row.user_id,
    arrivalDate: row.arrival_date,
    departureDate: row.departure_date,
  };
}

/** "INV-2026-0001" — sequential per calendar year, based on row id. */
function invoiceNumberFor(rowId: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(rowId).padStart(4, "0")}`;
}

/**
 * Inserts an order the first time it's seen for a given `sessionId`.
 *
 * Stripe (and our own bypass path) can call fulfilment more than once for the
 * same order, so this is the idempotency boundary: a duplicate call reports
 * `inserted: false` and callers should skip side effects like sending email.
 */
export async function insertOrderIfNew(
  order: PassOrder,
  userId: string | null
): Promise<{ inserted: boolean; stored: StoredOrder }> {
  const existing = await getOrderBySessionId(order.sessionId);
  if (existing) {
    return { inserted: false, stored: existing };
  }

  const db = getSupabase();

  const items = order.items;
  const singleItem = items.length === 1 ? items[0] : null;
  const arrivalDates = items.map((item) => item.registration.arrivalDate).sort();
  const departureDates = items.map((item) => item.registration.departureDate).sort();
  // For a mixed cart, the highest-priced tier decides `pass_key` — the same
  // "best entitlement wins" rule bookings already use across separate orders
  // (see bestOrderFor in booking.ts), applied within one order so nobody in
  // the group is denied an experience their group's pass should unlock.
  const bestTierKey = items.reduce((best, item) =>
    item.unitAmountCents > best.unitAmountCents ? item : best
  ).passKey;

  // Placeholder invoice number swapped for the real one once we know the row id.
  const { data: inserted, error: insertError } = await db
    .from("orders")
    .insert({
      session_id: order.sessionId,
      pass_key: singleItem ? singleItem.passKey : bestTierKey,
      pass_name: singleItem ? singleItem.passName : `${items.length} passes`,
      quantity: items.length,
      amount_total: order.amountTotal,
      currency: order.currency,
      customer_email: order.customerEmail,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      payment_intent_id: order.paymentIntentId,
      invoice_number: "",
      user_id: userId,
      // Earliest arrival / latest departure across all passes in the order.
      arrival_date: arrivalDates[0] ?? null,
      departure_date: departureDates[departureDates.length - 1] ?? null,
    })
    .select()
    .single<OrderRow>();

  if (insertError || !inserted) {
    // Unique violation on session_id means a concurrent request won the race.
    const raced = await getOrderBySessionId(order.sessionId);
    if (raced) return { inserted: false, stored: raced };
    throw new Error(`Failed to insert order ${order.sessionId}: ${insertError?.message}`);
  }

  const invoiceNumber = invoiceNumberFor(inserted.id);
  const { data: updated, error: updateError } = await db
    .from("orders")
    .update({ invoice_number: invoiceNumber })
    .eq("id", inserted.id)
    .select()
    .single<OrderRow>();

  if (updateError || !updated) {
    throw new Error(`Failed to set invoice number for order ${order.sessionId}: ${updateError?.message}`);
  }

  return { inserted: true, stored: toStoredOrder(updated) };
}

/** Keeps the admin orders table from loading the entire table into one request as the business grows. */
const ADMIN_LIST_LIMIT = 500;

export async function getAllOrders(): Promise<StoredOrder[]> {
  const db = getSupabase();

  const { data, error } = await db
    .from("orders")
    .select()
    .order("created_at", { ascending: false })
    .limit(ADMIN_LIST_LIMIT)
    .returns<OrderRow[]>();

  if (error) {
    throw new Error(`Failed to list orders: ${error.message}`);
  }

  return (data ?? []).map(toStoredOrder);
}

export async function getOrderBySessionId(sessionId: string): Promise<StoredOrder | null> {
  const db = getSupabase();

  const { data, error } = await db
    .from("orders")
    .select()
    .eq("session_id", sessionId)
    .maybeSingle<OrderRow>();

  if (error) {
    throw new Error(`Failed to look up order ${sessionId}: ${error.message}`);
  }

  return data ? toStoredOrder(data) : null;
}

/** Orders belonging to a logged-in customer, most recent first — powers the /account portal. */
export async function getOrdersByUserId(userId: string): Promise<StoredOrder[]> {
  const db = getSupabase();

  const { data, error } = await db
    .from("orders")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<OrderRow[]>();

  if (error) {
    throw new Error(`Failed to list orders for user ${userId}: ${error.message}`);
  }

  return (data ?? []).map(toStoredOrder);
}

/**
 * Escapes an email for use as an ILIKE *pattern* rather than a value.
 *
 * `%` and `_` are wildcards to ILIKE and both are legal in an email
 * local-part — `_` especially so. Unescaped, `a_b@example.com` matches
 * `axb@example.com`, which on the read below returns a stranger's account and
 * on the update below hands a stranger's unlinked orders to this user, invoice
 * and all. Postgres takes backslash as the escape character by default.
 */
function likeLiteral(value: string): string {
  return value.replace(/([\\%_])/g, "\\$1");
}

/**
 * The Supabase Auth user id for this email address, or null if nobody has an
 * account under it.
 *
 * Asks `auth.users` through a security-definer function (see schema.sql)
 * rather than looking for a previous order. An account can exist without ever
 * having bought anything — an Urban Sprint player, the operator, a buyer whose
 * first order failed part-way — and answering "no account" for one of those
 * sends fulfilment into a createUser that fails on the duplicate email, which
 * it then treats as a race and gives up on, leaving the order unlinked.
 */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const db = getSupabase();

  const { data, error } = await db.rpc("auth_user_id_for_email", { p_email: email });

  if (error) {
    throw new Error(`Failed to look up account for ${email}: ${error.message}`);
  }

  return (data as string | null) ?? null;
}

/** Lazily links any pre-existing, unlinked orders for this email once their account is created. */
export async function backfillOrdersForEmail(email: string, userId: string): Promise<void> {
  const db = getSupabase();

  const { error } = await db
    .from("orders")
    .update({ user_id: userId })
    .ilike("customer_email", likeLiteral(email))
    .is("user_id", null);

  if (error) {
    throw new Error(`Failed to backfill orders for ${email}: ${error.message}`);
  }
}
