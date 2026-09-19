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
import { getOrderItemsFromRegistrations, insertPassRegistrations } from "./pass-registrations-db";
import { getCheckoutDraft, deleteCheckoutDraft, type DraftItem } from "./checkout-drafts-db";
import type { PassRegistration } from "./registration";

export type PassOrderItem = DraftItem;

export type PassOrder = {
  /** Stripe Checkout Session id — the natural idempotency key for an order. */
  sessionId: string;
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
};

/** Pulls the fields we care about out of a completed Checkout Session, resolving its draft. */
export async function toPassOrder(session: Stripe.Checkout.Session): Promise<PassOrder> {
  const details = session.customer_details;
  const draftId = session.metadata?.draftId ?? null;

  // Null for orders placed before this draft-based flow existed.
  const items = draftId ? await getCheckoutDraft(draftId) : null;

  return {
    sessionId: session.id,
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
  };
}

/** The buyer's own registration, used to autofill their portal profile — the first pass in the cart. */
function primaryRegistration(order: PassOrder): PassRegistration | null {
  return order.items[0]?.registration ?? null;
}

/**
 * The single place where a paid order turns into delivered passes.
 *
 * Stripe retries webhooks and can deliver the same event more than once, so
 * each step below is separately idempotent rather than the whole function
 * being gated on one flag:
 *
 *   - the order row, on `sessionId` (`insertOrderIfNew`);
 *   - the registration rows, written once with the order;
 *   - the receipt, on `orders.confirmation_sent_at`.
 *
 * Splitting them matters because they fail independently. Recording the order
 * and then failing to email it used to be unrecoverable: the retry saw the
 * order already there and returned, so the buyer never got their receipt and
 * nothing anywhere said so. Now the retry lands on a receipt that hasn't been
 * sent and sends it.
 *
 * TODO: issue the actual pass number / QR code the buyer redeems at partner
 * locations — right now buyers get a receipt + invoice but no redeemable pass.
 */
export async function fulfillPassOrder(order: PassOrder): Promise<void> {
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

  await deliverReceipt(order, stored, account);

  // The draft holds a second copy of each traveller's passport number and
  // address, so it goes as soon as it's redundant. If the registrations
  // couldn't be written it is the last copy, and the 24-hour vacuum in
  // checkout-drafts-db can clear it instead.
  if (order.draftId && itemsStored) {
    await deleteCheckoutDraft(order.draftId);
  }
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
): Promise<void> {
  if (stored.confirmationSentAt) {
    console.info(`[fulfillment] Receipt for ${stored.sessionId} already went out — not resending.`);
    return;
  }

  if (!stored.customerEmail) {
    await recordConfirmationFailure(
      stored.sessionId,
      "Stripe didn't give us an email address for this buyer, so no receipt could be sent."
    );
    return;
  }

  try {
    // A redelivery arrives with an empty cart once the draft has been
    // deleted; the registrations hold the same items.
    const items =
      order.items.length > 0
        ? order.items
        : await getOrderItemsFromRegistrations(stored.sessionId);

    if (account.isNew) {
      await sendAccountWelcomeEmail(stored, items, account.password);
    } else {
      await sendOrderConfirmationEmail(stored, items);
    }
  } catch (error) {
    console.error(`[fulfillment] Receipt for ${stored.sessionId} could not be sent:`, error);

    const reason = error instanceof Error ? error.message : String(error);
    await recordConfirmationFailure(
      stored.sessionId,
      // An account created in this same run has a generated password that
      // only the failed email carried. Say so, because the fix is a password
      // reset from /admin > Customers, not just a resend.
      account.isNew
        ? `${reason} — this buyer's new account password was in that email and never reached them.`
        : reason
    );
    return;
  }

  await markConfirmationSent(stored.sessionId);
}
