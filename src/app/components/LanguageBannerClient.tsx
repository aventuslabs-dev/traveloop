"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
 * Shown only when the visitor's browser says they read a language the site
 * offers and they are not already on it. Rendered after mount because it
 * depends on `navigator.languages`, which the server cannot know — and because
 * a statically rendered page must not vary by visitor.
 */
export default function LanguageBannerClient({
  alternates,
}: {
  alternates: BannerAlternate[];
}) {
  const pathname = usePathname();
  const [offer, setOffer] = useState<BannerAlternate | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // Private mode or blocked storage: showing the banner once per visit is
      // a better failure than crashing the page.
    }
    if (dismissed) return;

    const preferred = navigator.languages ?? [navigator.language];
    const match = alternates.find((alternate) =>
      preferred.some((tag) =>
        alternate.prefixes.some((prefix) => tag.toLowerCase().startsWith(prefix))
      )
    );

    if (match) setOffer(match);
  }, [alternates]);

  function dismiss() {
    setOffer(null);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Nothing to do — it will simply be offered again next visit.
    }
  }

  if (!offer) return null;

  return (
    <div className="lang-banner" role="region" aria-label={offer.text} lang={offer.lang}>
      <p className="lang-banner-text">{offer.text}</p>
      <Link
        className="lang-banner-action"
        href={localizePath(pathname, offer.locale)}
        onClick={dismiss}
      >
        {offer.action}
      </Link>
      <button
        type="button"
        className="lang-banner-dismiss"
        onClick={dismiss}
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
