import { NextResponse } from "next/server";
import { findRedeemableCode } from "@/lib/discounts-db";
import { actionLocale } from "@/i18n/server";
import { getDictionary } from "@/i18n/dictionaries";
import { discountErrorMessage } from "@/i18n/errors";

export const runtime = "nodejs";

/**
 * Checks a code typed into the cart and returns its rule, so the cart can show
 * the saving before the buyer commits. A preview only: /api/checkout looks the
 * code up again and computes the real amount, so nothing returned here can
 * change what is charged.
 */
export async function POST(request: Request) {
  const { code } = ((await request.json().catch(() => null)) ?? {}) as { code?: unknown };
  const { registration } = await getDictionary(await actionLocale());

  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: registration.errors.discountUnknown }, { status: 400 });
  }

  try {
    const lookup = await findRedeemableCode(code);
    if (!lookup.ok) {
      return NextResponse.json(
        { error: discountErrorMessage(lookup.reason, registration.errors) },
        { status: 400 }
      );
    }
    const { id, label, kind, value, code: normalized } = lookup.rule;
    return NextResponse.json({ rule: { id, label, kind, value, code: normalized } });
  } catch (error) {
    console.error("[discounts] Code lookup failed:", error);
    return NextResponse.json({ error: registration.errors.discountCheckFailed }, { status: 500 });
  }
}
