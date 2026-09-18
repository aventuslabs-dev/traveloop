"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { localizePath, type Locale } from "@/i18n/config";

export type BannerAlternate = {
  locale: Locale;
  /** BCP 47 tag, so the browser pronounces and renders the strings correctly. */
  lang: string;
  prefixes: string[];
  text: string;
  action: string;
  dismiss: string;
};

const DISMISSED_KEY = "traveloop:lang-banner-dismissed";

/**
 * Whether this browser has dismissed the banner, as an external store.
 *
 * Same shape as `CookieNotice`, and for the same reason: `localStorage` is a
 * value React does not own and the server cannot see, which is precisely what
 * `useSyncExternalStore` exists for. Reading it in an effect and calling
 * `setState` renders twice on every page view and trips
 * `react-hooks/set-state-in-effect`.
 */
const store = {
  listeners: new Set<() => void>(),

  subscribe(listener: () => void) {
    store.listeners.add(listener);
    // Dismissing it in another tab should settle this one too.
    window.addEventListener("storage", listener);
    return () => {
      store.listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  },

  getSnapshot(): string {
    try {
      return window.localStorage.getItem(DISMISSED_KEY) ?? "0";
    } catch {
      // Private mode or blocked storage: offering the switch once per visit is
      // a better failure than crashing the page.
      return "0";
    }
  },

  /**
   * Never rendered on the server. It depends on this browser's storage and on
   * `navigator.languages`, neither of which the server knows — and these pages
   * are cached and served to everyone, so they must not vary by visitor.
   */
  getServerSnapshot(): string {
    return "1";
  },

  dismiss() {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Nothing to do — it will simply be offered again next visit.
    }
    store.listeners.forEach((listener) => listener());
  },
};

/** The locale this visitor's browser says they read, if the site offers it. */
function matchAlternate(alternates: BannerAlternate[]): BannerAlternate | null {
  const preferred = navigator.languages ?? [navigator.language];
  return (
    alternates.find((alternate) =>
      preferred.some((tag) =>
        alternate.prefixes.some((prefix) => tag.toLowerCase().startsWith(prefix))
      )
    ) ?? null
  );
}

/**
 * Shown only when the visitor's browser says they read a language the site
 * offers and they are not already on it.
 */
export default function LanguageBannerClient({
  alternates,
}: {
  alternates: BannerAlternate[];
}) {
  const pathname = usePathname();
  const dismissed = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  // Returning before this on the server and for dismissed visitors is what
  // keeps `navigator` off the server render path.
  if (dismissed === "1") return null;

  const offer = matchAlternate(alternates);
  if (!offer) return null;

  return (
    <div className="lang-banner" role="region" aria-label={offer.text} lang={offer.lang}>
      <p className="lang-banner-text">{offer.text}</p>
      <Link
        className="lang-banner-action"
        href={localizePath(pathname, offer.locale)}
        onClick={() => store.dismiss()}
      >
        {offer.action}
      </Link>
      <button
        type="button"
        className="lang-banner-dismiss"
        onClick={() => store.dismiss()}
        aria-label={offer.dismiss}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            d="M3 3l10 10M13 3L3 13"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
