import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icon } from "@/app/components/Icons";
import { getStripe } from "@/lib/stripe";
import { toPassOrder, type PassOrder } from "@/lib/fulfillment";
import { getOrderBySessionId, type StoredOrder } from "@/lib/orders-db";
import { getPassRegistrationsByOrder } from "@/lib/pass-registrations-db";
import { localizedPassName } from "@/app/data/passes";
import {
  CollectionCard,
  PassNumberList,
  type PassNumberEntry,
} from "@/app/components/PassCollection";
import { localePage, type LangParams } from "@/i18n/page";
import { pageMetadata } from "@/i18n/metadata";
import { fill } from "@/i18n/interpolate";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type CheckoutDict = Dictionary["checkout"];
type SuccessDict = CheckoutDict["success"];

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  return {
    ...(await pageMetadata(params, "/passes/success", (d) => d.checkout.success.meta)),
    robots: { index: false, follow: false },
  };
}

type SuccessPageProps = LangParams & {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * This page renders the receipt only — a summary shape that a freshly
 * retrieved Stripe session and a stored bypass order can both fill in,
 * without either needing per-pass registration details.
 */
type ReceiptOrder = {
  sessionId: string;
  /**
   * The short receipt number ("INV-2026-0001") customers quote to support.
   * Null until fulfilment has written the order row — a delayed payment method
   * can land on this page before Stripe's webhook does.
   */
  reference: string | null;
  passName: string;
  quantity: number;
  amountTotal: number;
  currency: string;
  customerName: string | null;
  customerEmail: string | null;
};

type OrderState =
  | { kind: "paid"; order: ReceiptOrder }
  | { kind: "processing"; order: ReceiptOrder }
  | { kind: "unavailable" };

export default async function CheckoutSuccessPage({ params, searchParams }: SuccessPageProps) {
  const { lang, dict } = await localePage(params);
  const sessionId = (await searchParams).session_id;

  if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    redirect(`/${lang}/passes`);
  }

  const state = await loadOrder(sessionId);
  // Only a paid order has passes; a pending bank transfer doesn't yet.
  const passes = state.kind === "paid" ? await loadPasses(sessionId, lang) : [];

  return (
    <>
      <Navbar dict={dict.common.nav} language={dict.common.language} forceScrolled />
      <main>
        <section className="passes-section section-light checkout-result">
          {state.kind === "unavailable" ? (
            <UnavailableState dict={dict.checkout.success} />
          ) : (
            <ConfirmedState state={state} passes={passes} dict={dict.checkout} />
          )}
        </section>
      </main>
      <Footer dict={dict.common.footer} />
    </>
  );
}

async function loadOrder(sessionId: string): Promise<OrderState> {
  // Bypass-mode orders never touch Stripe — fulfilment already ran synchronously
  // in the checkout route, so the local order record is authoritative here.
  if (sessionId.startsWith("cs_bypass_")) {
    const stored = await getOrderBySessionId(sessionId);
    return stored ? { kind: "paid", order: fromStoredOrder(stored) } : { kind: "unavailable" };
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    // Once fulfilment has run, the stored order is the record — and the only
    // one left: fulfilment deletes the checkout draft the cart was read from,
    // so a buyer landing after the webhook (every free order does) would
    // otherwise be shown an empty cart, "0 passes". The draft only speaks for
    // an order the webhook hasn't reached yet.
    const stored = await storedOrderFor(sessionId);
    const order = stored ? fromStoredOrder(stored) : fromDraft(await toPassOrder(session));

    // `paid` is the only state that means money has actually settled. FPX and
    // other delayed methods sit at `unpaid` until the bank confirms. A
    // `no_payment_required` order was made free by a code: nothing to settle.
    return session.payment_status === "paid" || session.payment_status === "no_payment_required"
      ? { kind: "paid", order }
      : { kind: "processing", order };
  } catch (error) {
    console.error("[checkout-success] Could not retrieve session:", error);
    return { kind: "unavailable" };
  }
}

/**
 * The stored order for a session, or null if fulfilment hasn't run yet. A
 * failed lookup also reads as null rather than failing the page: a paid order
 * should still render its confirmation from Stripe and the draft.
 */
async function storedOrderFor(sessionId: string): Promise<StoredOrder | null> {
  try {
    return await getOrderBySessionId(sessionId);
  } catch (error) {
    console.error("[checkout-success] Could not read the stored order:", error);
    return null;
  }
}

function fromStoredOrder(stored: StoredOrder): ReceiptOrder {
  return {
    sessionId: stored.sessionId,
    reference: stored.invoiceNumber || null,
    passName: stored.passName,
    quantity: stored.quantity,
    amountTotal: stored.amountTotal,
    currency: stored.currency,
    customerName: stored.customerName,
    customerEmail: stored.customerEmail,
  };
}

/** Before fulfilment: the cart as the checkout draft still holds it. No receipt number exists yet. */
function fromDraft(passOrder: PassOrder): ReceiptOrder {
  return {
    sessionId: passOrder.sessionId,
    reference: null,
    passName:
      passOrder.items.length === 1 ? passOrder.items[0].passName : `${passOrder.items.length} passes`,
    quantity: passOrder.items.length,
    amountTotal: passOrder.amountTotal,
    currency: passOrder.currency,
    customerName: passOrder.customerName,
    customerEmail: passOrder.customerEmail,
  };
}

/**
 * Each traveller's pass number, or none if fulfilment hasn't written them yet
 * — Stripe can send the buyer here before its webhook arrives. Like
 * referenceFor, a failure here must not take the confirmation down with it.
 */
async function loadPasses(sessionId: string, lang: Locale): Promise<PassNumberEntry[]> {
  try {
    const registrations = await getPassRegistrationsByOrder(sessionId);
    return registrations.flatMap((reg) =>
      reg.passNumber
        ? [
            {
              passNumber: reg.passNumber,
              traveller: reg.fullName,
              passLabel: localizedPassName(reg.passKey, lang, reg.passName),
              collectedOn: null,
            },
          ]
        : []
    );
  } catch (error) {
    console.error("[checkout-success] Could not read the pass numbers:", error);
    return [];
  }
}

function ConfirmedState({
  state,
  passes,
  dict: checkoutDict,
}: {
  state: Extract<OrderState, { kind: "paid" | "processing" }>;
  passes: PassNumberEntry[];
  dict: CheckoutDict;
}) {
  const dict = checkoutDict.success;
  const { order } = state;
  const isPaid = state.kind === "paid";

  const firstName = order.customerName?.split(" ")[0] ?? dict.fallbackName;
  // A single pass reads "Gold Pass"; several already carry their own wording.
  const passLabel =
    order.quantity > 1 ? order.passName : fill(dict.singlePassName, { pass: order.passName });
  const emailSuffix = order.customerEmail
    ? fill(isPaid ? dict.paidEmailSuffix : dict.processingEmailSuffix, {
        email: order.customerEmail,
      })
    : "";

  return (
    <div className="checkout-result-card">
      <span className={`checkout-result-icon${isPaid ? "" : " pending"}`}>
        <Icon name={isPaid ? "shield" : "clock"} />
      </span>

      <p className="eyebrow">{isPaid ? dict.paidEyebrow : dict.processingEyebrow}</p>
      <h1>
        {isPaid ? dict.paidHeadingLead : dict.processingHeadingLead}
        <br />
        <em>
          {isPaid
            ? fill(dict.paidHeadingEm, { name: firstName })
            : dict.processingHeadingEm}
        </em>
      </h1>

      <p className="checkout-result-lede">
        {isPaid
          ? fill(dict.paidLede, { pass: passLabel, email: emailSuffix })
          : fill(dict.processingLede, { email: emailSuffix })}
      </p>

      {isPaid &&
        (passes.length > 0 ? (
          <>
            <PassNumberList passes={passes} dict={checkoutDict.passNumbers} />
            <p className="pass-numbers-hint">{checkoutDict.passNumbers.hint}</p>
          </>
        ) : (
          <p className="pass-numbers-pending">
            <Icon name="clock" />
            {checkoutDict.passNumbers.pending}
          </p>
        ))}

      {isPaid && (
        <CollectionCard dict={checkoutDict.collection} passCount={order.quantity} />
      )}

      <dl className="checkout-summary">
        <div>
          <dt>{order.quantity > 1 ? dict.passLabelMany : dict.passLabelOne}</dt>
          <dd>{order.passName}</dd>
        </div>
        <div>
          <dt>{dict.total}</dt>
          <dd>
            {order.currency.toUpperCase()} {(order.amountTotal / 100).toFixed(2)}
          </dd>
        </div>
        {order.reference && (
          <div>
            <dt>{dict.reference}</dt>
            <dd className="checkout-summary-ref">{order.reference}</dd>
          </div>
        )}
      </dl>

      <div className="checkout-result-actions">
        <Link className="button primary" href="/account/login">
          {dict.customerPortal}
        </Link>
        {isPaid && (
          <Link
            className="button ghost dark"
            href={`/api/orders/${order.sessionId}/invoice?format=pdf`}
          >
            {dict.downloadInvoice}
          </Link>
        )}
        <Link className="button ghost dark" href="/contact">
          {dict.needHelp}
        </Link>
      </div>

      <p className="checkout-result-note">
        {order.reference ? dict.noteWithReference : dict.noteWithoutReference}
      </p>
    </div>
  );
}

function UnavailableState({ dict }: { dict: SuccessDict }) {
  return (
    <div className="checkout-result-card">
      <span className="checkout-result-icon pending">
        <Icon name="clock" />
      </span>
      <p className="eyebrow">{dict.unavailableEyebrow}</p>
      <h1>
        {dict.unavailableHeadingLead}
        <br />
        <em>{dict.unavailableHeadingEm}</em>
      </h1>
      <p className="checkout-result-lede">{dict.unavailableLede}</p>
      <div className="checkout-result-actions">
        <Link className="button primary" href="/contact">
          {dict.contactUs}
        </Link>
        <Link className="button ghost dark" href="/passes">
          {dict.backToPasses}
        </Link>
      </div>
    </div>
  );
}
