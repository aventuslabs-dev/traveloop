"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-auth";
import {
  DiscountConflictError,
  deleteDiscount,
  getDiscount,
  insertDiscount,
  updateDiscount,
  type DiscountInput,
  type StoredDiscount,
} from "@/lib/discounts-db";
import {
  DISCOUNT_CODE_PATTERN,
  MIN_CHARGE_CENTS,
  automaticDiscountCents,
  normalizeDiscountCode,
  type DiscountKind,
} from "@/lib/pricing";
import { passTiers } from "@/app/data/passes";

/**
 * Server Actions accept direct POSTs and skip the proxy's admin gate, so each
 * one re-checks the session, the same way order-actions.ts does.
 */
async function requireAdmin() {
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) {
    redirect("/admin/login");
  }
}

/** The form's raw fields, handed back on an error so nothing typed is lost. */
export type DiscountFormValues = {
  automatic: string;
  code: string;
  label: string;
  kind: string;
  value: string;
  startsOn: string;
  endsOn: string;
  maxRedemptions: string;
  active: string;
};

export type DiscountFormState = {
  status: "idle" | "error";
  error?: string;
  values?: DiscountFormValues;
  /** Bumped on every failed save, to re-mount the form with `values`. */
  attempt?: number;
};

const MAX_LABEL = 60;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function readValues(formData: FormData): DiscountFormValues {
  const field = (name: string) => String(formData.get(name) ?? "").trim();
  return {
    automatic: field("automatic"),
    code: field("code"),
    label: field("label"),
    kind: field("kind"),
    value: field("value"),
    startsOn: field("startsOn"),
    endsOn: field("endsOn"),
    maxRedemptions: field("maxRedemptions"),
    active: field("active"),
  };
}

/**
 * Validates the form into a discount. Dates are whole days in Malaysian time:
 * a discount runs from the start of its first day to the end of its last.
 * Whether it's automatic is fixed at creation — an edit can't turn a code
 * into a sitewide discount or back.
 */
function parse(
  values: DiscountFormValues,
  existing: StoredDiscount | null
): { ok: true; input: DiscountInput } | { ok: false; error: string } {
  const automatic = existing ? existing.automatic : values.automatic === "on";

  let code: string | null = null;
  if (!automatic) {
    code = normalizeDiscountCode(values.code);
    if (!DISCOUNT_CODE_PATTERN.test(code)) {
      return {
        ok: false,
        error: "Codes are 3–32 characters: letters, numbers, hyphens and underscores only.",
      };
    }
  }

  const label = values.label || code || "";
  if (!label) return { ok: false, error: "Give the discount a label, e.g. “Launch discount”." };
  if (label.length > MAX_LABEL) {
    return { ok: false, error: `Keep the label to ${MAX_LABEL} characters or fewer.` };
  }

  if (values.kind !== "percent" && values.kind !== "amount") {
    return { ok: false, error: "Choose whether the discount is a percentage or an amount." };
  }
  const kind: DiscountKind = values.kind;

  const entered = Number(values.value);
  if (!Number.isFinite(entered) || entered <= 0) {
    return { ok: false, error: "Enter a discount greater than zero." };
  }
  if (kind === "percent" && entered > 100) {
    return { ok: false, error: "A percentage can't be more than 100." };
  }
  // Percentages are stored as entered; amounts in sen.
  const value = kind === "percent" ? Math.round(entered * 100) / 100 : Math.round(entered * 100);

  // An automatic discount applies to every pass, so it must leave the
  // cheapest one at or above Stripe's minimum charge — below that, checkout
  // would fail for everyone.
  if (automatic) {
    const cheapest = Math.min(...passTiers.map((tier) => tier.listPriceCents));
    const rule = { id: 0, label, kind, value, code: null };
    if (cheapest - automaticDiscountCents(cheapest, rule) < MIN_CHARGE_CENTS) {
      return {
        ok: false,
        error: `That would price the cheapest pass below MYR ${(MIN_CHARGE_CENTS / 100).toFixed(
          2
        )}, the lowest amount Stripe can charge.`,
      };
    }
  }

  for (const date of [values.startsOn, values.endsOn]) {
    if (date && !DATE_RE.test(date)) return { ok: false, error: "Dates must be valid days." };
  }
  if (values.startsOn && values.endsOn && values.endsOn < values.startsOn) {
    return { ok: false, error: "The last day can't be before the first day." };
  }

  let maxRedemptions: number | null = null;
  if (!automatic && values.maxRedemptions) {
    maxRedemptions = Number(values.maxRedemptions);
    if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1) {
      return { ok: false, error: "Maximum uses must be a whole number of 1 or more, or blank." };
    }
  }

  return {
    ok: true,
    input: {
      code,
      label,
      kind,
      value,
      automatic,
      active: values.active === "on",
      startsAt: values.startsOn ? `${values.startsOn}T00:00:00+08:00` : null,
      endsAt: values.endsOn ? `${values.endsOn}T23:59:59.999+08:00` : null,
      maxRedemptions,
    },
  };
}

const CONFLICTS = {
  duplicateCode: "Another discount already uses that code.",
  secondAutomatic:
    "Another automatic discount is already switched on. Switch that one off first — only one can apply at a time.",
};

/** Public pages print the automatic discount into their prices. */
function revalidatePrices() {
  revalidatePath("/[lang]", "page");
  revalidatePath("/[lang]/passes", "page");
  revalidatePath("/[lang]/passes/register", "page");
}

/** Creates a discount, or updates the one named by the form's `id`. */
export async function saveDiscount(
  prev: DiscountFormState,
  formData: FormData
): Promise<DiscountFormState> {
  await requireAdmin();

  const id = Number(formData.get("id")) || null;
  const values = readValues(formData);
  const failed = (error: string): DiscountFormState => ({
    status: "error",
    error,
    values,
    attempt: (prev.attempt ?? 0) + 1,
  });

  const existing = id ? await getDiscount(id) : null;
  if (id && !existing) return failed("That discount no longer exists.");

  const parsed = parse(values, existing);
  if (!parsed.ok) return failed(parsed.error);

  let savedId: number;
  try {
    if (id) {
      await updateDiscount(id, parsed.input);
      savedId = id;
    } else {
      savedId = await insertDiscount(parsed.input);
    }
  } catch (error) {
    if (error instanceof DiscountConflictError) return failed(CONFLICTS[error.conflict]);
    console.error("[admin] Failed to save discount:", error);
    return failed("Couldn't save that discount. Please try again.");
  }

  revalidatePath("/admin/discounts");
  if (parsed.input.automatic) revalidatePrices();
  redirect(`/admin/discounts/${savedId}?saved=1`);
}

/** Deletes a discount that has never been used. A used one is switched off instead, from its form. */
export async function removeDiscount(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  const discount = await getDiscount(id);
  if (!discount) redirect("/admin/discounts");
  if (discount.redemptions > 0) redirect(`/admin/discounts/${id}?error=used`);

  let failed = false;
  try {
    await deleteDiscount(id);
  } catch (error) {
    console.error(`[admin] Failed to delete discount ${id}:`, error);
    failed = true;
  }
  // redirect() works by throwing, so it stays outside the try above.
  if (failed) redirect(`/admin/discounts/${id}?error=delete`);

  revalidatePath("/admin/discounts");
  if (discount.automatic) revalidatePrices();
  redirect("/admin/discounts?deleted=1");
}
