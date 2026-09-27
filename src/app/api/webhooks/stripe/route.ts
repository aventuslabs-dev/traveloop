import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { fulfillPassOrder, toPassOrder } from "@/lib/fulfillment";
import { getCheckoutDraft } from "@/lib/checkout-drafts-db";
import { recordPaymentAttempt } from "@/lib/payment-attempts-db";

export const runtime = "nodejs";

/**
 * Stripe webhook endpoint.
 *
 * Payment is confirmed here, not on the success page — a buyer can close the
 * tab before being redirected back, and Malaysian methods like FPX settle
 * asynchronously minutes after checkout is submitted.
 *
 * The endpoint must be subscribed to these events in Stripe Dashboard >
 * Developers > Webhooks. An event Stripe isn't sending simply never arrives,
 * with nothing here to show it's missing:
 *
 *   checkout.session.completed                — fulfils a paid order
 *   checkout.session.async_payment_succeeded  — fulfils a settled FPX order
 *   checkout.session.async_payment_failed     — logs an unsettled FPX order
 *   payment_intent.payment_failed             — records a declined payment
 *   checkout.session.expired                  — records an abandoned checkout
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  // Must be the raw, unparsed body — the signature covers the exact bytes sent.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe-webhook] Signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // Delayed-notification methods arrive here still unpaid; those are
        // fulfilled by async_payment_succeeded instead. An order a discount
        // code made free completes as `no_payment_required` — nothing is owed,
        // so it is as settled as a paid one.
        if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
          await fulfillCompletedSession(session.id);
        } else {
          console.info(
            `[stripe-webhook] Session ${session.id} completed but is ${session.payment_status}; awaiting settlement.`
          );
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        await fulfillCompletedSession(event.data.object.id);
        break;
      }

      case "checkout.session.async_payment_failed": {
        // Logged but not recorded: Stripe raises payment_intent.payment_failed
        // for the same failure, and that branch writes the row. Recording both
        // would show one failed FPX payment as two failed attempts.
        console.warn(
          `[stripe-webhook] Delayed payment failed for session ${event.data.object.id}.`
        );
        break;
      }

      // Nothing else remembers a checkout that didn't become an order — the
      // orders table only ever holds successes — so the two events below are
      // the only record the admin console can show.
      case "payment_intent.payment_failed": {
        await recordFailedPaymentIntent(event.id, event.created, event.data.object);
        break;
      }

      case "checkout.session.expired": {
        await recordExpiredSession(event.id, event.created, event.data.object);
        break;
      }

      default:
        break;
    }
  } catch (error) {
    // A non-2xx tells Stripe to retry, which is what we want if fulfilment broke.
    console.error(`[stripe-webhook] Failed handling ${event.type}:`, error);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** Re-reads the session from Stripe, then hands it to fulfilment. */
async function fulfillCompletedSession(sessionId: string): Promise<void> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);

  await fulfillPassOrder(await toPassOrder(session));
}

/** A declined card, or a delayed method that never settled. */
async function recordFailedPaymentIntent(
  eventId: string,
  createdAt: number,
  intent: Stripe.PaymentIntent
): Promise<void> {
  const session = await findCheckoutSession(intent.id);
  const draftId = intent.metadata?.draftId ?? session?.metadata?.draftId ?? null;
  const details = session?.customer_details;
  const cart = await describeCart(session?.id ?? null);
  const failure = intent.last_payment_error;

  await recordPaymentAttempt({
    eventId,
    status: "failed",
    sessionId: session?.id ?? null,
    paymentIntentId: intent.id,
    draftId,
    // The session is the better source: it knows the cart total, while the
    // intent only knows what this particular attempt tried to charge.
    amountTotal: session?.amount_total ?? intent.amount,
    currency: session?.currency ?? intent.currency,
    customerEmail: details?.email ?? intent.receipt_email ?? null,
    customerName: details?.name ?? (await draftBuyerName(draftId)),
    customerPhone: details?.phone ?? null,
    // `description` is the cart summary set at checkout — the fallback for a
    // session whose line items we couldn't read.
    passSummary: cart.summary ?? intent.description ?? null,
    quantity: cart.quantity,
    // decline_code names the actual reason ("insufficient_funds"); `code` is
    // the generic bucket ("card_declined") and only helps when it's absent.
    failureCode: failure?.decline_code ?? failure?.code ?? null,
    failureMessage: failure?.message ?? null,
    occurredAt: new Date(createdAt * 1000).toISOString(),
  });

  console.warn(
    `[stripe-webhook] Payment failed for ${intent.id}: ${failure?.decline_code ?? failure?.code ?? "unknown"}.`
  );
}

/** A checkout the buyer walked away from; Stripe expires it about a day later. */
async function recordExpiredSession(
  eventId: string,
  createdAt: number,
  session: Stripe.Checkout.Session
): Promise<void> {
  const draftId = session.metadata?.draftId ?? null;
  const details = session.customer_details;
  const cart = await describeCart(session.id);

  await recordPaymentAttempt({
    eventId,
    status: "expired",
    sessionId: session.id,
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
    draftId,
    amountTotal: session.amount_total,
    currency: session.currency,
    customerEmail: details?.email ?? session.customer_email ?? null,
    customerName: details?.name ?? (await draftBuyerName(draftId)),
    customerPhone: details?.phone ?? null,
    passSummary: cart.summary,
    quantity: cart.quantity,
    failureCode: null,
    failureMessage: null,
    occurredAt: new Date(createdAt * 1000).toISOString(),
  });
}

/**
 * The Checkout Session a PaymentIntent belongs to.
 *
 * `payment_intent.payment_failed` carries only the intent, and the intent has
 * no buyer name or phone — those live on the session's customer_details.
 */
async function findCheckoutSession(
  paymentIntentId: string
): Promise<Stripe.Checkout.Session | null> {
  try {
    const found = await getStripe().checkout.sessions.list({
      payment_intent: paymentIntentId,
      limit: 1,
    });
    return found.data[0] ?? null;
  } catch (error) {
    // A missing session costs us the buyer's name, not the record itself.
    console.error(`[stripe-webhook] No checkout session for ${paymentIntentId}:`, error);
    return null;
  }
}

/**
 * What was in the cart, read back from Stripe's own line items.
 *
 * Not from the checkout draft: a session expires after ~24 hours and the draft
 * is vacuumed on the same schedule, so by the time an abandoned checkout is
 * reported its draft is usually already gone. Stripe still has the line items.
 */
async function describeCart(
  sessionId: string | null
): Promise<{ summary: string | null; quantity: number | null }> {
  if (!sessionId) return { summary: null, quantity: null };

  try {
    const lineItems = await getStripe().checkout.sessions.listLineItems(sessionId, { limit: 20 });
    if (lineItems.data.length === 0) return { summary: null, quantity: null };

    const quantity = lineItems.data.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    const summary = lineItems.data
      .map((item) => {
        // "Traveloop Gold Pass" reads as "Gold Pass" in a column that is
        // entirely Traveloop passes.
        const name = (item.description ?? "Pass").replace(/^Traveloop\s+/, "");
        return `${item.quantity ?? 1} × ${name}`;
      })
      .join(", ");

    return { summary, quantity };
  } catch (error) {
    console.error(`[stripe-webhook] Couldn't read line items for ${sessionId}:`, error);
    return { summary: null, quantity: null };
  }
}

/**
 * The name the buyer typed on the registration form, for a checkout where
 * Stripe never collected one. Best-effort: the draft may already be gone.
 */
async function draftBuyerName(draftId: string | null): Promise<string | null> {
  if (!draftId) return null;

  try {
    const items = await getCheckoutDraft(draftId);
    return items?.[0]?.registration.fullName ?? null;
  } catch (error) {
    console.error(`[stripe-webhook] Couldn't read draft ${draftId}:`, error);
    return null;
  }
}
