/**
 * Discount maths — the one place a pass price is computed, shared by the cart
 * (in the browser, for display), the checkout route (for what Stripe charges)
 * and the admin console. Pure and free of server imports so all three can use
 * it; the browser's answer is only ever a preview, and checkout recomputes it.
 *
 * Rules (see the discounts table in supabase/schema.sql):
 *   - An automatic discount comes off each pass's list price.
 *   - A code then comes off the order: a percentage of the discounted total, or
 *     a fixed amount once per order.
 *   - A code that covers the whole order makes it free: Stripe accepts a MYR 0
 *     checkout (it still collects the buyer's email and phone) and the webhook
 *     fulfils it. Short of that, nothing takes an order below MIN_CHARGE_CENTS,
 *     Stripe's minimum charge in MYR — it refuses any total between zero and that.
 */

export type DiscountKind = "percent" | "amount";

export type DiscountRule = {
  id: number;
  /** "Launch discount", or a code's own label. */
  label: string;
  kind: DiscountKind;
  /** A percentage (0–100, decimals allowed) for `percent`; sen for `amount`. */
  value: number;
  /** Null for an automatic discount. */
  code: string | null;
};

export const MIN_CHARGE_CENTS = 200;

/** What an automatic discount takes off one pass. */
export function automaticDiscountCents(listCents: number, rule: DiscountRule | null): number {
  if (!rule) return 0;
  const off = rule.kind === "percent" ? Math.round((listCents * rule.value) / 100) : rule.value;
  return Math.min(Math.max(off, 0), listCents);
}

export type CartQuote = {
  /** Every pass at list price. */
  subtotalCents: number;
  automaticDiscountCents: number;
  codeDiscountCents: number;
  /** What gets charged. */
  totalCents: number;
};

export function quoteCart(
  listPricesCents: number[],
  automatic: DiscountRule | null,
  code: DiscountRule | null
): CartQuote {
  const subtotalCents = listPricesCents.reduce((sum, cents) => sum + cents, 0);
  const automaticCents = listPricesCents.reduce(
    (sum, cents) => sum + automaticDiscountCents(cents, automatic),
    0
  );
  const afterAutomatic = subtotalCents - automaticCents;

  let codeCents = 0;
  if (code && afterAutomatic > 0) {
    const raw =
      code.kind === "percent" ? Math.round((afterAutomatic * code.value) / 100) : code.value;
    codeCents =
      raw >= afterAutomatic
        ? afterAutomatic
        : Math.min(Math.max(raw, 0), Math.max(afterAutomatic - MIN_CHARGE_CENTS, 0));
  }

  return {
    subtotalCents,
    automaticDiscountCents: automaticCents,
    codeDiscountCents: codeCents,
    totalCents: afterAutomatic - codeCents,
  };
}

/** 12.5 → "12.5", 50 → "50" — a percentage without trailing zeros. */
export function formatPercent(value: number): string {
  return String(Number(value.toFixed(2)));
}

/** 2000 → "20.00" */
export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * "50% off", "MYR 10.00 off each pass", "MYR 20.00 off" — English, for the
 * invoice, email and admin console. The site words these from its dictionaries.
 */
export function describeDiscount(rule: Pick<DiscountRule, "kind" | "value" | "code">): string {
  if (rule.kind === "percent") return `${formatPercent(rule.value)}% off`;
  return `MYR ${formatCents(rule.value)} off${rule.code ? "" : " each pass"}`;
}

/** Codes as stored: upper-case, no spaces. */
export function normalizeDiscountCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export const DISCOUNT_CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;
