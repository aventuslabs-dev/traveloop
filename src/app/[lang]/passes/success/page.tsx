import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icon } from "@/app/components/Icons";
import { getStripe } from "@/lib/stripe";
import { toPassOrder } from "@/lib/fulfillment";
import { getOrderBySessionId } from "@/lib/orders-db";
import { localePage, type LangParams } from "@/i18n/page";
import { pageMetadata } from "@/i18n/metadata";
import { fill } from "@/i18n/interpolate";
import type enCheckout from "@/i18n/dictionaries/en/checkout";

type SuccessDict = typeof enCheckout.success;

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
  const t = dict.checkout.success;

  return (
    <>
      <Navbar dict={dict.common.nav} language={dict.common.language} forceScrolled />
      <main>
        <section className="passes-section section-light checkout-result">
          {state.kind === "unavailable" ? (
            <UnavailableState dict={t} />
          ) : (
            <ConfirmedState state={state} dict={t} />
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
    return stored
      ? {
          kind: "paid",
          order: {
            sessionId: stored.sessionId,
            reference: stored.invoiceNumber || null,
            passName: stored.passName,
            quantity: stored.quantity,
            amountTotal: stored.amountTotal,
            currency: stored.currency,
            customerName: stored.customerName,
            customerEmail: stored.customerEmail,
          },
        }
      : { kind: "unavailable" };
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const passOrder = await toPassOrder(session);

    const order: ReceiptOrder = {
      sessionId: passOrder.sessionId,
      reference: await referenceFor(sessionId),
      passName:
        passOrder.items.length === 1 ? passOrder.items[0].passName : `${passOrder.items.length} passes`,
      quantity: passOrder.items.length,
      amountTotal: passOrder.amountTotal,
      currency: passOrder.currency,
      customerName: passOrder.customerName,
      customerEmail: passOrder.customerEmail,
    };

    // `paid` is the only state that means money has actually settled. FPX and
    // other delayed methods sit at `unpaid` until the bank confirms.
    return session.payment_status === "paid"
      ? { kind: "paid", order }
      : { kind: "processing", order };
  } catch (error) {
    console.error("[checkout-success] Could not retrieve session:", error);
    return { kind: "unavailable" };
  }
}

/**
 * The stored receipt number for a session, or null if fulfilment hasn't run
 * yet. Kept off the main path deliberately: a paid order should still render
 * its confirmation if this lookup fails, just without a reference to quote.
 */
async function referenceFor(sessionId: string): Promise<string | null> {
  try {
    const stored = await getOrderBySessionId(sessionId);
    return stored?.invoiceNumber || null;
  } catch (error) {
    console.error("[checkout-success] Could not read the order reference:", error);
    return null;
  }
}

function ConfirmedState({
  state,
  dict,
}: {
  state: Extract<OrderState, { kind: "paid" | "processing" }>;
  dict: SuccessDict;
}) {
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
