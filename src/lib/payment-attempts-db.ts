import { getSupabase } from "./supabase";

/**
 * 'failed'  — money was asked for and refused (card declined, FPX not settled).
 * 'expired' — the buyer left the Stripe page and the session timed out, so no
 *             payment was ever attempted. Stripe raises this ~24h later, which
 *             is why these rows show up a day after the fact.
 */
export type PaymentAttemptStatus = "failed" | "expired";

/** A checkout that did not turn into an order. */
export type PaymentAttempt = {
  /** The Stripe event id — the idempotency key, since Stripe delivers at least once. */
  eventId: string;
  status: PaymentAttemptStatus;
  sessionId: string | null;
  paymentIntentId: string | null;
  draftId: string | null;
  amountTotal: number | null;
  currency: string | null;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  passSummary: string | null;
  quantity: number | null;
  failureCode: string | null;
  failureMessage: string | null;
  /** When Stripe raised the event, not when we recorded it. */
  occurredAt: string;
};

export type StoredPaymentAttempt = PaymentAttempt & { createdAt: string };

type AttemptRow = {
  event_id: string;
  status: PaymentAttemptStatus;
  session_id: string | null;
  payment_intent_id: string | null;
  draft_id: string | null;
  amount_total: number | null;
  currency: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  pass_summary: string | null;
  quantity: number | null;
  failure_code: string | null;
  failure_message: string | null;
  occurred_at: string;
  created_at: string;
};

function toStoredAttempt(row: AttemptRow): StoredPaymentAttempt {
  return {
    eventId: row.event_id,
    status: row.status,
    sessionId: row.session_id,
    paymentIntentId: row.payment_intent_id,
    draftId: row.draft_id,
    amountTotal: row.amount_total,
    currency: row.currency,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    passSummary: row.pass_summary,
    quantity: row.quantity,
    failureCode: row.failure_code,
    failureMessage: row.failure_message,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

/**
 * Records a lost checkout, ignoring a repeat delivery of the same Stripe event.
 *
 * Throws on a real database failure so the webhook can answer non-2xx and let
 * Stripe retry — the whole point of the table is that nothing else remembers
 * these, so silently dropping one defeats it.
 */
export async function recordPaymentAttempt(attempt: PaymentAttempt): Promise<void> {
  const db = getSupabase();

  const { error } = await db.from("payment_attempts").upsert(
    {
      event_id: attempt.eventId,
      status: attempt.status,
      session_id: attempt.sessionId,
      payment_intent_id: attempt.paymentIntentId,
      draft_id: attempt.draftId,
      amount_total: attempt.amountTotal,
      currency: attempt.currency,
      customer_email: attempt.customerEmail,
      customer_name: attempt.customerName,
      customer_phone: attempt.customerPhone,
      pass_summary: attempt.passSummary,
      quantity: attempt.quantity,
      failure_code: attempt.failureCode,
      failure_message: attempt.failureMessage,
      occurred_at: attempt.occurredAt,
    },
    { onConflict: "event_id", ignoreDuplicates: true }
  );

  if (error) {
    throw new Error(`Failed to record payment attempt ${attempt.eventId}: ${error.message}`);
  }
}

/** Matches the orders list — enough history to be useful, bounded enough to stay one request. */
const ADMIN_LIST_LIMIT = 500;

export async function getAllPaymentAttempts(): Promise<StoredPaymentAttempt[]> {
  const db = getSupabase();

  const { data, error } = await db
    .from("payment_attempts")
    .select()
    .order("occurred_at", { ascending: false })
    .limit(ADMIN_LIST_LIMIT)
    .returns<AttemptRow[]>();

  if (error) {
    throw new Error(`Failed to list payment attempts: ${error.message}`);
  }

  return (data ?? []).map(toStoredAttempt);
}

/** How far back "recent" reaches, shared by the nav badge and the payments page. */
export const RECENT_WINDOW_DAYS = 7;

/**
 * Failures in the last `days` days, for the nav badge.
 *
 * Deliberately not a total: the all-time count only ever grows, so it would sit
 * in the rail as a permanent red number nobody can ever clear. A recent count
 * answers the question the badge is actually for — is something wrong *now*.
 */
export async function countRecentFailedPayments(days = RECENT_WINDOW_DAYS): Promise<number> {
  const db = getSupabase();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await db
    .from("payment_attempts")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("occurred_at", since);

  if (error) {
    throw new Error(`Failed to count recent failed payments: ${error.message}`);
  }

  return count ?? 0;
}
