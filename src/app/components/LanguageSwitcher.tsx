"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type MouseEvent } from "react";
import { htmlLang, localeLabel, localeName, locales, localizePath } from "@/i18n/config";
import { useLocale } from "@/i18n/Link";
import { fill } from "@/i18n/interpolate";

/**
 * The language control: a segmented pill showing both options at once.
 *
 * A dropdown would cost two taps for a binary choice and, worse, hide the
 * Chinese option behind a flag a Chinese speaker has to guess at. Both labels
 * are their own autonyms — never translated, and never a flag: "English" is
 * not the United States, and Chinese is read in Malaysia, Singapore and Taiwan
 * as much as in China.
 *
 * `translate="no"` is what keeps that true in practice. Chrome's page
 * translation rewrites `中文` into the English word "Chinese", which turns the
 * one control a Chinese reader needs to find into a word they may not read —
 * and it happens precisely on the English page, where they are most likely to
 * be stuck. The attribute is the standard opt-out and covers the label and
 * the `aria-label` alike.
 *
 * They are real links, so middle-click and "open in new tab" work and crawlers
 * can follow them to the other locale — which is what makes the hreflang tags
 * in the layout mean anything.
 */
export default function LanguageSwitcher({
  labels,
  className = "",
}: {
  labels: { label: string; switchTo: string };
  className?: string;
}) {
  const active = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  /**
   * Query and hash, read after mount rather than via `useSearchParams()`.
   * This component sits in the nav on every page, and `useSearchParams()`
   * would opt every one of them out of static rendering.
   */
  const [suffix, setSuffix] = useState("");

  useEffect(() => {
    const read = () => setSuffix(window.location.search + window.location.hash);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [pathname]);

  return (
    <div
      className={`lang-switch${pending ? " pending" : ""} ${className}`.trim()}
      role="group"
      aria-label={labels.label}
    >
      {locales.map((locale) => {
        const isActive = locale === active;
        const href = localizePath(pathname, locale) + suffix;

        function onClick(event: MouseEvent<HTMLAnchorElement>) {
          // Let the browser handle new-tab, new-window and middle clicks.
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          ) {
            return;
          }
          event.preventDefault();
          // A locale switch re-renders the whole tree from the server, so
          // without a transition the control sits dead for a beat on a slow
          // connection. `pending` dims it instead.
          startTransition(() => router.push(href));
        }

        return (
          <a
            key={locale}
            href={href}
            hrefLang={htmlLang[locale]}
            lang={htmlLang[locale]}
            onClick={onClick}
            translate="no"
            className={`lang-switch-option notranslate${isActive ? " active" : ""}`}
            aria-current={isActive ? "true" : undefined}
            aria-label={
              isActive ? undefined : fill(labels.switchTo, { language: localeName[locale] })
            }
          >
            {localeLabel[locale]}
          </a>
        );
      })}
    </div>
  );
}
