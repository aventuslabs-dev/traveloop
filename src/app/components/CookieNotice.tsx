"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "@/i18n/Link";
import type enCommon from "@/i18n/dictionaries/en/common";

const ACKNOWLEDGED_KEY = "traveloop:cookie-notice-ack";

/**
 * Whether this browser has seen the notice, as an external store.
 *
 * `localStorage` is exactly what `useSyncExternalStore` is for: a value React
 * does not own, that the server cannot see. Reading it in an effect and
 * calling `setState` would work too, but it renders twice on every page view
 * and trips `react-hooks/set-state-in-effect`.
 */
const store = {
  listeners: new Set<() => void>(),

  subscribe(listener: () => void) {
    store.listeners.add(listener);
    // Another tab acknowledging it should settle this one too.
    window.addEventListener("storage", listener);
    return () => {
      store.listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  },

  /** "1" once acknowledged. A browser that refuses storage reads as not yet. */
  getSnapshot(): string {
    try {
      return window.localStorage.getItem(ACKNOWLEDGED_KEY) ?? "0";
    } catch {
      return "0";
    }
  },

  /**
   * On the server the notice is never rendered. It depends on this browser's
   * storage, which the server cannot know — and these pages are cached and
   * served to everyone, so they must not vary by visitor.
   */
  getServerSnapshot(): string {
    return "1";
  },

  acknowledge() {
    try {
      window.localStorage.setItem(ACKNOWLEDGED_KEY, "1");
    } catch {
      // Nothing to do — it will simply be shown again next visit.
    }
    store.listeners.forEach((listener) => listener());
  },
};

/**
 * Tells visitors which cookies the site sets, once, and remembers that they
 * have seen it.
 *
 * This is a *notice*, not a consent gate, because everything the site stores
 * is strictly necessary: the locale the visitor picked and, for signed-in
 * customers, the Supabase session. Nothing is set for advertising and nothing
 * follows anyone off the site, so there is nothing here to withhold — an
 * "Accept / Reject" pair would offer a choice that changes nothing, which is
 * its own kind of dishonest.
 *
 * Add analytics and that changes: those scripts then have to stay unloaded
 * until the visitor has actually chosen, and this has to grow a real reject
 * path rather than a single acknowledgement.
 */
export default function CookieNotice({ dict }: { dict: typeof enCommon.cookies }) {
  const acknowledged = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  const acknowledge = useCallback(() => store.acknowledge(), []);

  if (acknowledged === "1") return null;

  return (
    <div className="cookie-notice" role="region" aria-label={dict.label}>
      <p className="cookie-notice-text">
        {dict.text}{" "}
        <Link className="cookie-notice-link" href="/privacy">
          {dict.policy}
        </Link>
      </p>
      <button type="button" className="cookie-notice-accept" onClick={acknowledge}>
        {dict.accept}
      </button>
    </div>
  );
}
