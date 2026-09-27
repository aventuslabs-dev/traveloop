import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSiteUrl, getStripe, isPaymentsBypassEnabled, siteIsPubliclyReachable } from "@/lib/stripe";
import { PASS_CURRENCY, getPassTier } from "@/app/data/passes";
import {
  NO_DISCOUNT,
  discountToMetadata,
  fulfillPassOrder,
  type OrderDiscount,
  type PassOrder,
  type PassOrderItem,
} from "@/lib/fulfillment";
import { findRedeemableCode, getActiveAutomaticDiscount } from "@/lib/discounts-db";
import {
  automaticDiscountCents,
  describeDiscount,
  quoteCart,
  type CartQuote,
  type DiscountRule,
} from "@/lib/pricing";
import { parseRegistration } from "@/lib/registration";
import { actionLocale } from "@/i18n/server";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { discountErrorMessage, registrationErrorMessage } from "@/i18n/errors";
import { fill } from "@/i18n/interpolate";
import { insertCheckoutDraft, type DraftItem } from "@/lib/checkout-drafts-db";

export const runtime = "nodejs";

const MAX_ITEMS = 20;

/**
 * An error response the buyer will actually read, in the language they are
 * buying in.
 *
 * The register page shows `error` from this route verbatim, so an English
 * string here lands in the middle of a Chinese checkout. `actionLocale` reads
 * the Referer of the fetch, which is the /en or /cn page that made it.
 */
async function fail(
  pick: (t: Dictionary["registration"]["errors"]) => string,
  status: number
): Promise<NextResponse> {
  const { registration } = await getDictionary(await actionLocale());
  return NextResponse.json({ error: pick(registration.errors) }, { status });
}

/**
 * Creates a Stripe Checkout Session for a cart of one or more passes and
 * returns its hosted-page URL. The browser sends only tier keys and, if the
 * buyer entered one, a discount code — prices and discounts are worked out
 * here, so a tampered request can't change what gets charged. Tiers can be
 * mixed in one cart (e.g. 2 Gold + 3 Silver).
 *
 * The automatic (launch) discount is baked into each pass's unit price; a
 * code becomes a single-use Stripe coupon for exactly the amount it saves, so
 * Stripe's page shows the same discount line the invoice will.
 *
 * Each pass needs its own tourist-registration/insurance details. Those are
 * too large (and too many, for a big cart) to fit in Stripe's metadata, so
 * they're written to a short-lived `checkout_drafts` row instead and only its
 * id rides in session metadata. An abandoned checkout leaves that draft row
 * behind but nothing else — no order, no registration.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
    // Not localized, here or for "Unknown pass tier." below: the form cannot
    // produce either one. They answer a hand-made request, and the only reader
    // is whoever wrote it.
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { items: rawItems, discountCode } = (body ?? {}) as {
    items?: unknown;
    discountCode?: unknown;
  };

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return fail((t) => t.cartEmpty, 400);
  }
  if (rawItems.length > MAX_ITEMS) {
    return fail((t) => fill(t.tooManyPasses, { max: MAX_ITEMS }), 400);
  }

  let automatic: DiscountRule | null;
  let code: DiscountRule | null = null;
  try {
    automatic = await getActiveAutomaticDiscount();
    if (typeof discountCode === "string" && discountCode.trim()) {
      const lookup = await findRedeemableCode(discountCode);
      if (!lookup.ok) {
        return fail((t) => discountErrorMessage(lookup.reason, t), 400);
      }
      code = lookup.rule;
    }
  } catch (error) {
    console.error("[checkout] Couldn't load discounts:", error);
    return fail((t) => t.checkoutFailed, 500);
  }

  const items: DraftItem[] = [];
  for (const raw of rawItems) {
    const { passKey, registration } = (raw ?? {}) as { passKey?: unknown; registration?: unknown };

    const tier = getPassTier(passKey);
    if (!tier) {
      return NextResponse.json({ error: "Unknown pass tier." }, { status: 400 });
    }

    const parsed = parseRegistration(registration);
    if (!parsed.ok) {
      return fail((t) => registrationErrorMessage(parsed.error, t), 400);
    }

    items.push({
      passKey: tier.key,
      passName: tier.name,
      listAmountCents: tier.listPriceCents,
      unitAmountCents:
        tier.listPriceCents - automaticDiscountCents(tier.listPriceCents, automatic),
      registration: parsed.value,
    });
  }

  const quote = quoteCart(
    items.map((item) => item.listAmountCents ?? item.unitAmountCents),
    automatic,
    code
  );
  const discount = orderDiscount(quote, automatic, code);

  const siteUrl = getSiteUrl();

  // No real Stripe keys yet (or PAYMENTS_TEST_MODE=true): fulfil the order
  // directly instead of redirecting to Stripe, so the buyer flow — order
  // record, confirmation email, invoice — can be exercised end-to-end.
  if (isPaymentsBypassEnabled()) {
    // The form no longer collects an email — Stripe does — so the bypass
    // needs one from the environment to exercise account creation locally.
    const order: PassOrder = {
      sessionId: `cs_bypass_${randomUUID()}`,
      draftId: null,
      items,
      amountTotal: quote.totalCents,
      currency: PASS_CURRENCY,
      customerEmail: process.env.PAYMENTS_TEST_EMAIL ?? "test@example.com",
      customerName: items[0].registration.fullName,
      customerPhone: null,
      paymentIntentId: null,
      discount,
    };

    try {
      await fulfillPassOrder(order);
    } catch (error) {
      console.error("[checkout] Bypass fulfilment failed:", error);
      return NextResponse.json(
        { error: "We couldn't complete your test order. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: `${siteUrl}/passes/success?session_id=${order.sessionId}`,
    });
  }

  try {
    const draftId = await insertCheckoutDraft(items);

    const lineItems = buildLineItems(items, siteUrl);
    const stripe = getStripe();

    // One coupon per checkout, for exactly this order's saving: the code's
    // rules (percent of the order, fixed once per order, the minimum-charge
    // floor) are ours, so Stripe is only ever told the resulting amount.
    const coupon =
      discount.codeCents > 0
        ? await stripe.coupons.create({
            amount_off: discount.codeCents,
            currency: PASS_CURRENCY,
            duration: "once",
            max_redemptions: 1,
            name: (discount.codeLabel ?? "Discount").slice(0, 40),
          })
        : null;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      locale: "auto",
      line_items: lineItems,
      ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
      // Carried through to the webhook, which is where fulfilment happens.
      metadata: { draftId, ...discountToMetadata(discount) },
      payment_intent_data: {
        metadata: { draftId },
        description: describeCart(items),
      },
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      success_url: `${siteUrl}/passes/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/passes?checkout=cancelled#pricing`,
    });

    if (!session.url) {
      throw new Error("Stripe returned a session without a checkout URL.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Log the detail server-side; return something safe to show a buyer.
    console.error("[checkout] Failed to create Stripe Checkout Session:", error);

    const isConfigError =
      error instanceof Stripe.errors.StripeAuthenticationError ||
      (error instanceof Error && error.message.includes("STRIPE_SECRET_KEY"));

    return fail(
      (t) => (isConfigError ? t.paymentsUnavailable : t.checkoutFailed),
      isConfigError ? 503 : 500
    );
  }
}

/** The discount as recorded on the order: worded now, so later edits don't rewrite past invoices. */
function orderDiscount(
  quote: CartQuote,
  automatic: DiscountRule | null,
  code: DiscountRule | null
): OrderDiscount {
  const discount = { ...NO_DISCOUNT };

  if (automatic && quote.automaticDiscountCents > 0) {
    discount.automaticLabel = `${automatic.label} (${describeDiscount(automatic)})`;
    discount.automaticCents = quote.automaticDiscountCents;
  }
  // A code that saves nothing (the order is already at the minimum charge)
  // isn't recorded as used.
  if (code && quote.codeDiscountCents > 0) {
    discount.codeId = code.id;
    discount.code = code.code;
    discount.codeLabel = `${code.code} (${describeDiscount(code)})`;
    discount.codeCents = quote.codeDiscountCents;
  }

  return discount;
}

/** One Stripe line item per distinct tier in the cart, quantity = how many of that tier. */
function buildLineItems(
  items: PassOrderItem[],
  siteUrl: string
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const byTier = new Map<string, { item: PassOrderItem; quantity: number }>();

  for (const item of items) {
    const existing = byTier.get(item.passKey);
    if (existing) {
      existing.quantity += 1;
    } else {
      byTier.set(item.passKey, { item, quantity: 1 });
    }
  }

  const tier = (key: string) => getPassTier(key);

  return Array.from(byTier.values()).map(({ item, quantity }) => ({
    quantity,
    price_data: {
      currency: PASS_CURRENCY,
      unit_amount: item.unitAmountCents,
      product_data: {
        name: `Traveloop ${item.passName} Pass`,
        description: tier(item.passKey)?.highlights.join(" · ").slice(0, 500),
        // Stripe fetches this itself, so only send it when the host is reachable.
        ...(siteIsPubliclyReachable() ? { images: [`${siteUrl}/traveloop-logo.webp`] } : {}),
      },
    },
  }));
}

function describeCart(items: DraftItem[]): string {
  if (items.length === 1) return `Traveloop ${items[0].passName} Pass`;
  return `${items.length} Traveloop Passes`;
}
