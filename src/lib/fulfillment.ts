import type Stripe from "stripe";
import {
  insertOrderIfNew,
  markConfirmationSent,
  recordConfirmationFailure,
  type StoredOrder,
} from "./orders-db";
import { sendOrderConfirmationEmail, sendAccountWelcomeEmail } from "./email";
import { findOrCreateCustomerAccount, type CustomerAccountResult } from "./customer-account";
import { upsertCustomerProfile } from "./customer-profile-db";
import {
  getOrderItemsFromRegistrations,
  insertPassRegistrations,
  type IssuedPassItem,
} from "./pass-registrations-db";
import { getCheckoutDraft, deleteCheckoutDraft, type DraftItem } from "./checkout-drafts-db";
import type { PassRegistration } from "./registration";
import { raceDetailsFor } from "./urban-sprint/race-details";

export type PassOrderItem = DraftItem;

/**
 * What an order was discounted by, worded and computed at checkout. Stored
 * with the order so its invoice reads the same after the discount itself is
 * edited or deleted.
 */
export type OrderDiscount = {
  /** "Launch discount (50% off)", or null when none applied. */
  automaticLabel: string | null;
  automaticCents: number;
  codeId: number | null;
  code: string | null;
  /** "SUMMER10 (10% off)". */
  codeLabel: string | null;
  codeCents: number;
};

export const NO_DISCOUNT: OrderDiscount = {
  automaticLabel: null,
  automaticCents: 0,
  codeId: null,
  code: null,
  codeLabel: null,
  codeCents: 0,
};

/**
 * The discount rides to the webhook in Stripe metadata (strings only, 500
 * characters a value), next to the draft id. These two are the only readers
 * and writers of those keys.
 */
export function discountToMetadata(discount: OrderDiscount): Record<string, string> {
  return {
    autoDiscountLabel: discount.automaticLabel ?? "",
    autoDiscountCents: String(discount.automaticCents),
    discountId: discount.codeId === null ? "" : String(discount.codeId),
    discountCode: discount.code ?? "",
    discountLabel: discount.codeLabel ?? "",
    discountCents: String(discount.codeCents),
  };
}

function discountFromMetadata(metadata: Stripe.Metadata | null): OrderDiscount {
  if (!metadata) return NO_DISCOUNT;
  const cents = (value: string | undefined) => Number.parseInt(value ?? "", 10) || 0;
  return {
    automaticLabel: metadata.autoDiscountLabel || null,
    automaticCents: cents(metadata.autoDiscountCents),
    codeId: metadata.discountId ? cents(metadata.discountId) : null,
    code: metadata.discountCode || null,
    codeLabel: metadata.discountLabel || null,
    codeCents: cents(metadata.discountCents),
  };
}

/**
 * What an order bought (orders.product). An Urban Sprint team entry is sold
 * with a Platinum Pass for every racer, so it goes through the same order,
 * account and pass pipeline as a Premier Pass purchase — `items` holds the
 * racers' passes, and this says what the money was for.
 */
export type OrderProduct =
  | { kind: "pass" }
  | {
      kind: "urban_sprint";
      /** The Booking ID, "US-ABCD1234". */
      reference: string;
      /** "The Night Owls · Sat, 3 Oct 2026, 9:00 AM", fixed at purchase. */
      description: string;
    };

export const PASS_PRODUCT: OrderProduct = { kind: "pass" };

export type PassOrder = {
  /** Stripe Checkout Session id — the natural idempotency key for an order. */
  sessionId: string;
  product: OrderProduct;
  /** The draft id this order's items came from, if any — deleted once fulfilment finishes with it. */
  draftId: string | null;
  /** One entry per pass purchased; length >= 1. */
  items: PassOrderItem[];
  /** Total actually captured, in the smallest currency unit. */
  amountTotal: number;
  currency: string;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  paymentIntentId: string | null;
  discount: OrderDiscount;
  /**
   * Which item is the buyer's own registration, for their portal profile.
   * Omitted means the first, as on /passes/register; null means none of them
   * is — an Urban Sprint payer need not be racing.
   */
  buyerItem?: number | null;
};

/** Whether the buyer's receipt is out, for callers that keep a record of their own (Urban Sprint bookings). */
export type ReceiptOutcome = { sent: true } | { sent: false; reason: string };

/** Pulls the fields we care about out of a completed Checkout Session, resolving its draft. */
export async function toPassOrder(session: Stripe.Checkout.Session): Promise<PassOrder> {
  const details = session.customer_details;
  const draftId = session.metadata?.draftId ?? null;

  // Null for orders placed before this draft-based flow existed.
  const items = draftId ? await getCheckoutDraft(draftId) : null;

  return {
    sessionId: session.id,
    product: PASS_PRODUCT,
    draftId,
    items: items ?? [],
    amountTotal: session.amount_total ?? 0,
    currency: session.currency ?? "myr",
    customerEmail: details?.email ?? session.customer_email ?? null,
    customerName: details?.name ?? null,
    customerPhone: details?.phone ?? null,
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
    discount: discountFromMetadata(session.metadata),
  };
}

/** The buyer's own registration, used to autofill their portal profile — the first pass in the cart unless told otherwise. */
function primaryRegistration(order: PassOrder): PassRegistration | null {
  if (order.buyerItem === null) return null;
  return order.items[order.buyerItem ?? 0]?.registration ?? null;
}

/**
 * The single place where a paid order turns into delivered passes.
 *
 * Stripe retries webhooks and can deliver the same event more than once, so
 * each step below is separately idempotent rather than the whole function
 * being gated on one flag:
 *
 *   - the order row, on `sessionId` (`insertOrderIfNew`);
 *   - the registration rows, written once with the order — the database
 *     issues each one its pass number as it goes in;
 *   - the receipt, on `orders.confirmation_sent_at`.
 *
 * Splitting them matters because they fail independently. Recording the order
 * and then failing to email it used to be unrecoverable: the retry saw the
 * order already there and returned, so the buyer never got their receipt and
 * nothing anywhere said so. Now the retry lands on a receipt that hasn't been
 * sent and sends it.
 *
 * Both products come through here. An Urban Sprint team entry arrives from
 * lib/urban-sprint/booking-fulfillment with one Platinum Pass per racer as
 * its items, so the team's payer gets the same account, passes, invoice and
 * receipt as any pass buyer — the receipt just carries the race as well.
 */
export async function fulfillPassOrder(
  order: PassOrder
): Promise<{ stored: StoredOrder; receipt: ReceiptOutcome }> {
  const account = order.customerEmail
    ? await findOrCreateCustomerAccount(order.customerEmail, order.customerName)
    : { userId: null, isNew: false as const };

  // Registration details belong to the person, so they're saved even if this
  // webhook turns out to be a duplicate delivery. A failure here must not
  // block the order or its email — the purchase itself is what matters.
  const registration = primaryRegistration(order);
  if (account.userId && registration) {
    try {
      await upsertCustomerProfile(account.userId, registration);
    } catch (error) {
      console.error(`[fulfillment] Failed to save profile for ${order.sessionId}:`, error);
    }
  }

  const { inserted, stored } = await insertOrderIfNew(order, account.userId);

  // Whether this delivery put the traveller details somewhere that outlives
  // the draft — the draft is only safe to delete once they are. A redelivery
  // leaves it false either way: the first delivery has already deleted the
  // draft, or it kept it precisely because that insert failed and the draft
  // is the last copy of those details.
  let itemsStored = false;

  if (inserted) {
    if (order.items.length === 0) {
      itemsStored = true;
    } else {
      try {
        await insertPassRegistrations(order.sessionId, account.userId, order.items);
        itemsStored = true;
      } catch (error) {
        console.error(`[fulfillment] Failed to save pass registrations for ${order.sessionId}:`, error);
      }
    }

    console.info("[fulfillment] Pass(es) purchased:", {
      sessionId: stored.sessionId,
      invoiceNumber: stored.invoiceNumber,
      quantity: stored.quantity,
      pass: stored.passName,
      total: `${stored.currency.toUpperCase()} ${(stored.amountTotal / 100).toFixed(2)}`,
      email: stored.customerEmail,
      phone: stored.customerPhone,
    });
  } else {
    console.info(
      `[fulfillment] Order ${order.sessionId} is already recorded — checking its receipt.`
    );
  }

  const receipt = await deliverReceipt(order, stored, account);

  // The draft holds a second copy of each traveller's passport number and
  // address, so it goes as soon as it's redundant. If the registrations
  // couldn't be written it is the last copy, and the 24-hour vacuum in
  // checkout-drafts-db can clear it instead.
  if (order.draftId && itemsStored) {
    await deleteCheckoutDraft(order.draftId);
  }

  return { stored, receipt };
}

/**
 * Sends the buyer their receipt, exactly once across every delivery of the
 * event, and records the outcome either way.
 *
 * Deliberately swallows a send failure rather than letting it reach the
 * webhook. Answering Stripe with a 500 here would mean a payment that has
 * been taken, an order that has been recorded and passes that have been
 * issued all being reported as failed fulfilment, parked in a retry loop
 * against a provider that is usually still down — while the one thing left
 * undone is invisible to everyone. Writing the reason onto the order instead
 * puts it in front of the operator on /admin, next to a resend button, and
 * the buyer can still download the same invoice from the success page and
 * the customer portal.
 */
async function deliverReceipt(
  order: PassOrder,
  stored: StoredOrder,
  account: CustomerAccountResult
): Promise<ReceiptOutcome> {
  if (stored.confirmationSentAt) {
    console.info(`[fulfillment] Receipt for ${stored.sessionId} already went out — not resending.`);
    return { sent: true };
  }

  if (!stored.customerEmail) {
    const reason = "Stripe didn't give us an email address for this buyer, so no receipt could be sent.";
    await recordConfirmationFailure(stored.sessionId, reason);
    return { sent: false, reason };
  }

  try {
    const items = await receiptItems(order, stored.sessionId);
    const race = await raceDetailsFor(stored);

    if (account.isNew) {
      await sendAccountWelcomeEmail(stored, items, account.password, race);
    } else {
      await sendOrderConfirmationEmail(stored, items, race);
    }
  } catch (error) {
    console.error(`[fulfillment] Receipt for ${stored.sessionId} could not be sent:`, error);

    const message = error instanceof Error ? error.message : String(error);
    // An account created in this same run has a generated password that
    // only the failed email carried. Say so, because the fix is a password
    // reset from /admin > Customers, not just a resend.
    const reason = account.isNew
      ? `${message} — this buyer's new account password was in that email and never reached them.`
      : message;
    await recordConfirmationFailure(stored.sessionId, reason);
    return { sent: false, reason };
  }

  await markConfirmationSent(stored.sessionId);
  return { sent: true };
}

/**
 * The passes a receipt lists. The stored registrations come first: they are
 * the only place the pass numbers exist, and the durable copy a redelivery
 * (whose draft is already deleted) has to use anyway.
 *
 * The draft is the fallback, without numbers, for when the registrations
 * couldn't be written or read back. A receipt missing its pass numbers beats
 * no receipt, especially a welcome email carrying the only copy of a new
 * account's password; the numbers still reach the buyer through the portal
 * and an admin resend once the registrations are sorted out.
 */
async function receiptItems(order: PassOrder, sessionId: string): Promise<IssuedPassItem[]> {
  try {
    const issued = await getOrderItemsFromRegistrations(sessionId);
    if (issued.length > 0) return issued;
  } catch (error) {
    console.error(`[fulfillment] Couldn't read back the passes for ${sessionId}:`, error);
  }

  return order.items.map((item) => ({ ...item, passNumber: null }));
}
