import { getSupabase } from "./supabase";
import { normalizeDiscountCode, type DiscountKind, type DiscountRule } from "./pricing";

/** A discount as the admin console sees it. See the discounts table in supabase/schema.sql. */
export type StoredDiscount = {
  id: number;
  code: string | null;
  label: string;
  kind: DiscountKind;
  value: number;
  automatic: boolean;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  maxRedemptions: number | null;
  createdAt: string;
  /** Paid orders that used it. Always 0 for an automatic discount, which orders don't reference. */
  redemptions: number;
};

type DiscountRow = {
  id: number;
  code: string | null;
  label: string;
  kind: DiscountKind;
  value: number | string;
  automatic: boolean;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_redemptions: number | null;
  created_at: string;
  orders?: { count: number }[];
};

function toStoredDiscount(row: DiscountRow): StoredDiscount {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    kind: row.kind,
    // Postgres numeric can arrive as a string; the maths needs a number.
    value: Number(row.value),
    automatic: row.automatic,
    active: row.active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    maxRedemptions: row.max_redemptions,
    createdAt: row.created_at,
    redemptions: row.orders?.[0]?.count ?? 0,
  };
}

export function toRule(discount: StoredDiscount): DiscountRule {
  return {
    id: discount.id,
    label: discount.label,
    kind: discount.kind,
    value: discount.value,
    code: discount.code,
  };
}

export type DiscountStatus = "live" | "off" | "scheduled" | "ended" | "usedUp";

/** Whether a discount applies right now, and if not, why not. */
export function discountStatus(discount: StoredDiscount, now = new Date()): DiscountStatus {
  if (!discount.active) return "off";
  if (discount.startsAt && new Date(discount.startsAt) > now) return "scheduled";
  if (discount.endsAt && new Date(discount.endsAt) <= now) return "ended";
  if (discount.maxRedemptions !== null && discount.redemptions >= discount.maxRedemptions) {
    return "usedUp";
  }
  return "live";
}

/**
 * Stands in for the seeded launch discount until the migration that creates
 * the discounts table has run, so prices neither jump nor break checkout in
 * the gap between a deploy and its migration. Any other failure throws.
 */
const LAUNCH_DISCOUNT_BEFORE_MIGRATION: DiscountRule = {
  id: 0,
  label: "Launch discount",
  kind: "percent",
  value: 50,
  code: null,
};

function isMissingTable(error: { code?: string; message: string }): boolean {
  return error.code === "PGRST205" || error.code === "42P01";
}

/**
 * The automatic discount applying to every pass right now, or null.
 *
 * Throws on a database failure rather than guessing: this decides what
 * people are charged, and a guess in either direction is wrong money.
 */
export async function getActiveAutomaticDiscount(): Promise<DiscountRule | null> {
  const db = getSupabase();

  const { data, error } = await db
    .from("discounts")
    .select()
    .eq("automatic", true)
    .eq("active", true)
    .order("id", { ascending: true })
    .returns<DiscountRow[]>();

  if (error) {
    if (isMissingTable(error)) return LAUNCH_DISCOUNT_BEFORE_MIGRATION;
    throw new Error(`Failed to load the automatic discount: ${error.message}`);
  }

  const live = (data ?? []).map(toStoredDiscount).find((d) => discountStatus(d) === "live");
  return live ? toRule(live) : null;
}

export type CodeLookup =
  | { ok: true; rule: DiscountRule }
  | { ok: false; reason: "unknown" | "scheduled" | "ended" | "usedUp" };

/**
 * A code a buyer typed, if it can be used right now.
 *
 * A switched-off code reads as unknown rather than "disabled": the buyer can
 * do nothing with the difference, and it would confirm the code exists.
 *
 * Uses are checked against paid orders, so two buyers racing for a code's
 * last use can both get it. For a promo code that's an acceptable overshoot
 * of one; a hard cap would need a reservation that abandoned checkouts hold.
 */
export async function findRedeemableCode(input: string): Promise<CodeLookup> {
  const code = normalizeDiscountCode(input);
  if (!code) return { ok: false, reason: "unknown" };

  const db = getSupabase();

  const { data, error } = await db
    .from("discounts")
    .select("*, orders(count)")
    .eq("code", code)
    .eq("automatic", false)
    .maybeSingle<DiscountRow>();

  if (error) {
    // Before the migration there are no codes, so every code is unknown.
    if (isMissingTable(error)) return { ok: false, reason: "unknown" };
    throw new Error(`Failed to look up discount code ${code}: ${error.message}`);
  }
  if (!data) return { ok: false, reason: "unknown" };

  const discount = toStoredDiscount(data);
  const status = discountStatus(discount);
  if (status === "live") return { ok: true, rule: toRule(discount) };
  return { ok: false, reason: status === "off" ? "unknown" : status };
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export async function listDiscounts(): Promise<StoredDiscount[]> {
  const db = getSupabase();

  const { data, error } = await db
    .from("discounts")
    .select("*, orders(count)")
    // The automatic discount first, then codes newest first.
    .order("automatic", { ascending: false })
    .order("id", { ascending: false })
    .returns<DiscountRow[]>();

  if (error) {
    throw new Error(`Failed to list discounts: ${error.message}`);
  }

  return (data ?? []).map(toStoredDiscount);
}

export async function getDiscount(id: number): Promise<StoredDiscount | null> {
  const db = getSupabase();

  const { data, error } = await db
    .from("discounts")
    .select("*, orders(count)")
    .eq("id", id)
    .maybeSingle<DiscountRow>();

  if (error) {
    throw new Error(`Failed to load discount ${id}: ${error.message}`);
  }

  return data ? toStoredDiscount(data) : null;
}

export type DiscountInput = {
  code: string | null;
  label: string;
  kind: DiscountKind;
  value: number;
  automatic: boolean;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  maxRedemptions: number | null;
};

/** Thrown when a save hits a uniqueness rule the admin form should explain. */
export class DiscountConflictError extends Error {
  constructor(public readonly conflict: "duplicateCode" | "secondAutomatic") {
    super(conflict);
  }
}

function toRow(input: DiscountInput) {
  return {
    code: input.code,
    label: input.label,
    kind: input.kind,
    value: input.value,
    automatic: input.automatic,
    active: input.active,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    max_redemptions: input.maxRedemptions,
    updated_at: new Date().toISOString(),
  };
}

function conflictOrThrow(error: { code?: string; message: string }, context: string): never {
  if (error.code === "23505") {
    throw new DiscountConflictError(
      error.message.includes("discounts_one_active_automatic") ? "secondAutomatic" : "duplicateCode"
    );
  }
  throw new Error(`${context}: ${error.message}`);
}

export async function insertDiscount(input: DiscountInput): Promise<number> {
  const db = getSupabase();

  const { data, error } = await db
    .from("discounts")
    .insert(toRow(input))
    .select("id")
    .single<{ id: number }>();

  if (error || !data) {
    conflictOrThrow(error ?? { message: "no row returned" }, "Failed to create discount");
  }

  return data.id;
}

export async function updateDiscount(id: number, input: DiscountInput): Promise<void> {
  const db = getSupabase();

  const { error } = await db.from("discounts").update(toRow(input)).eq("id", id);

  if (error) {
    conflictOrThrow(error, `Failed to update discount ${id}`);
  }
}

/**
 * Deletes a discount outright. Orders that used it keep their own record of
 * the amount and wording (the foreign key nulls out), so their invoices are
 * unaffected — but the console loses the count, so the page offers switching
 * it off instead once it has been used.
 */
export async function deleteDiscount(id: number): Promise<void> {
  const db = getSupabase();

  const { error } = await db.from("discounts").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete discount ${id}: ${error.message}`);
  }
}
