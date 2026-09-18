import Stripe from "stripe";

/**
 * Server-side Stripe client. Never import this from a Client Component —
 * it reads the secret key, which only exists in the Node.js runtime.
 *
 * The API version is intentionally omitted so the SDK uses the version it was
 * built against, which is the one its TypeScript types describe.
 */
let cached: Stripe | null = null;

/**
 * True only on the real production deployment.
 *
 * Vercel sets `VERCEL_ENV` to "production", "preview" or "development", while
 * `NODE_ENV` is "production" for preview builds too. The difference matters
 * here: previews are *meant* to run Stripe test keys, and production is the
 * only place that must refuse them.
 */
export function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === "production";
}

export function getStripe(): Stripe {
  if (cached) return cached;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Copy env.example to .env.local and fill in your Stripe keys."
    );
  }

  /**
   * The publishable key (pk_…) sits directly above the secret one in the
   * Stripe dashboard and is the easier of the two to copy by mistake — it is
   * also the one that is *safe* to hand around, so it is the one that turns up
   * in chats and tickets. It cannot create a Checkout Session: Stripe would
   * reject the call with an opaque auth error at the exact moment a buyer
   * tried to pay. Naming the mistake here costs one comparison.
   *
   * This app never needs a publishable key at all — checkout is Stripe's
   * hosted page, reached by redirecting to the session URL, so no Stripe code
   * runs in the browser.
   */
  if (!/^(sk|rk)_/.test(secretKey)) {
    throw new Error(
      `STRIPE_SECRET_KEY is ${
        secretKey.startsWith("pk_") ? "a publishable key (pk_…)" : "not a Stripe secret key"
      }. It must be the secret key, which starts with sk_ (or rk_ for a ` +
        "restricted key): Stripe Dashboard > Developers > API keys > Secret key > Reveal."
    );
  }

  /**
   * A test key on the live site is the worst failure this file can allow:
   * Stripe accepts the payment, the buyer gets a receipt, and no money ever
   * moves. Failing the request is recoverable — a silent month of unpaid
   * orders is not. Previews are exempt, since test keys are correct there.
   */
  if (isProductionDeployment() && secretKey.startsWith("sk_test_")) {
    throw new Error(
      "STRIPE_SECRET_KEY is a test key (sk_test_…) on the production deployment. " +
        "Set the live key (sk_live_…) in Vercel > Settings > Environment Variables > Production."
    );
  }

  cached = new Stripe(secretKey, {
    typescript: true,
    maxNetworkRetries: 2,
    appInfo: { name: "Traveloop", url: "https://traveloop.my" },
  });

  return cached;
}

/**
 * Absolute base URL used to build Stripe return URLs.
 *
 * Read from configuration rather than the request's Host/Origin header: those
 * are attacker-controlled, and feeding them into `success_url` would let a
 * forged Host bounce a real buyer to another site after payment.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";

  throw new Error(
    "NEXT_PUBLIC_SITE_URL must be set in production so Stripe can redirect buyers back to the site."
  );
}

/**
 * Deep link into the Stripe Dashboard, e.g. `payments/pi_123`.
 *
 * Test-mode data lives under a separate `/test` path and is invisible from the
 * live one, so the link has to follow whichever key this deployment is using —
 * otherwise every link from a preview build lands on "no such payment".
 *
 * Server-only: it reads the secret key to decide, so never call it from a
 * Client Component.
 */
export function stripeDashboardUrl(path: string): string {
  const isTestKey = /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "");
  return `https://dashboard.stripe.com/${isTestKey ? "test/" : ""}${path}`;
}

/** True when the site URL is publicly reachable, so Stripe can fetch product images from it. */
export function siteIsPubliclyReachable(): boolean {
  const url = getSiteUrl();
  return !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(url);
}

/**
 * True when checkout should skip Stripe entirely and fulfil the order
 * directly, so the buyer flow can be tested before real Stripe keys exist.
 *
 * Only ever true on a developer's own machine. `PAYMENTS_TEST_MODE=true` used
 * to force it on anywhere, including production, where it hands out real
 * passes for free to anyone who finds the checkout button — one stray
 * environment variable away from giving the product away. Any deployed build
 * now refuses it outright, whatever the variable says; a deployment that wants
 * to exercise checkout without taking money uses Stripe's own test keys, which
 * is what they are for.
 */
export function isPaymentsBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;

  if (process.env.PAYMENTS_TEST_MODE === "true") return true;
  if (process.env.PAYMENTS_TEST_MODE === "false") return false;

  const key = process.env.STRIPE_SECRET_KEY;
  const looksConfigured = !!key && !key.includes("replace_me");
  return !looksConfigured;
}
