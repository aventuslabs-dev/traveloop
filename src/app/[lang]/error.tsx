"use client";

import { useEffect } from "react";
import { useLocale } from "@/i18n/Link";
import type { Locale } from "@/i18n/config";

/**
 * Catches an unhandled error anywhere under a locale segment and shows
 * something branded instead of Next's stock error screen.
 *
 * The copy lives here rather than in the dictionaries because this is a Client
 * Component: `getDictionary` is server-only by design (the whole dictionary is
 * far larger than any page needs in the browser), and an error boundary that
 * needs a server round-trip to render its own text is a boundary that fails
 * when the server is what broke. Five strings inline is the cheaper trade.
 */
const COPY: Record<Locale, {
  eyebrow: string;
  heading: string;
  body: string;
  retry: string;
  home: string;
  contact: string;
  reference: string;
}> = {
  en: {
    eyebrow: "Something went wrong",
    heading: "This page didn't load.",
    body:
      "Something on our side failed rather than anything you did. Try again — " +
      "and if it keeps happening, tell us and we'll look into it.",
    retry: "Try again",
    home: "Back to home",
    contact: "Contact us",
    reference: "Reference",
  },
  cn: {
    eyebrow: "出了点问题",
    heading: "此页面加载失败。",
    body: "这是我们这边的问题，与您的操作无关。请重试；若问题持续出现，请告知我们，我们会跟进处理。",
    retry: "重试",
    home: "返回首页",
    contact: "联系我们",
    reference: "错误编号",
  },
};

export default function LocaleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const lang = useLocale();
  const t = COPY[lang];

  useEffect(() => {
    // The only record of this in production, until error monitoring is wired
    // up. `digest` is what matches it to the server-side log — the message
    // itself is deliberately generic for errors thrown on the server.
    console.error("[error-boundary]", error.digest ?? "(no digest)", error);
  }, [error]);

  return (
    <main id="main">
      <section className="arrival section-light page-hero">
        <div className="section-heading centered">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.heading}</h1>
          <p>{t.body}</p>
        </div>
        <div className="notfound-actions">
          <button className="button primary" type="button" onClick={() => unstable_retry()}>
            {t.retry}
          </button>
          <a className="button ghost dark" href={`/${lang}`}>
            {t.home}
          </a>
          <a className="button ghost dark" href={`/${lang}/contact`}>
            {t.contact}
          </a>
        </div>
        {/*
          Shown so a visitor reporting the problem can quote it, and support can
          find the matching server log. Absent for errors thrown in the browser.
        */}
        {error.digest ? (
          <p className="error-digest">
            {t.reference}: <code>{error.digest}</code>
          </p>
        ) : null}
      </section>
    </main>
  );
}
