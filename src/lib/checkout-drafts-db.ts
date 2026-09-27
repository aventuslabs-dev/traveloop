import { getSupabase } from "./supabase";
import type { PassRegistration } from "./registration";

/** One pass in a cart, before payment. */
export type DraftItem = {
  passKey: string;
  passName: string;
  /** Price after the automatic discount, before any code — what the pass itself costs. */
  unitAmountCents: number;
  /** Price before any discount. Absent on drafts written before discounts existed. */
  listAmountCents?: number;
  registration: PassRegistration;
};

type DraftRow = {
  id: string;
  items: DraftItem[];
};

/** Registrations sit in a draft for minutes, not days — a day is a generous ceiling for an abandoned Stripe session. */
const DRAFT_MAX_AGE_HOURS = 24;

/** Stores a cart's items and returns the draft id to carry through Stripe metadata. */
export async function insertCheckoutDraft(items: DraftItem[]): Promise<string> {
  const db = getSupabase();

  const { data, error } = await db
    .from("checkout_drafts")
    .insert({ items })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(`Failed to save checkout draft: ${error?.message}`);
  }

  // Best-effort vacuum of abandoned drafts (cart data incl. passport numbers,
  // addresses) that never turned into an order. Piggybacks on new-draft
  // traffic instead of needing a cron job; never blocks checkout on failure.
  void deleteStaleCheckoutDrafts();

  return data.id;
}

async function deleteStaleCheckoutDrafts(): Promise<void> {
  const db = getSupabase();
  const cutoff = new Date(Date.now() - DRAFT_MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();

  const { error } = await db.from("checkout_drafts").delete().lt("created_at", cutoff);

  if (error) {
    console.error("[checkout-drafts] Failed to vacuum stale drafts:", error.message);
  }
}

export async function getCheckoutDraft(id: string): Promise<DraftItem[] | null> {
  const db = getSupabase();

  const { data, error } = await db
    .from("checkout_drafts")
    .select("id, items")
    .eq("id", id)
    .maybeSingle<DraftRow>();

  if (error) {
    throw new Error(`Failed to load checkout draft ${id}: ${error.message}`);
  }

  return data?.items ?? null;
}

/** Best-effort cleanup once a draft has been turned into an order — never blocks fulfilment. */
export async function deleteCheckoutDraft(id: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from("checkout_drafts").delete().eq("id", id);

  if (error) {
    console.error(`[checkout-drafts] Failed to delete draft ${id}:`, error.message);
  }
}
