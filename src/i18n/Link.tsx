"use client";

import NextLink from "next/link";
import { useParams } from "next/navigation";
import { type ComponentProps } from "react";
import { defaultLocale, isLocale, type Locale } from "./config";

/**
 * The locale of the route the component is rendering under.
 *
 * Reads the `[lang]` segment rather than the pathname so it stays correct
 * inside components that render above the current page, and works in both
 * client and (via `params`) server-rendered passes of a client component.
 */
export function useLocale(): Locale {
  const params = useParams<{ lang?: string }>();
  return isLocale(params?.lang) ? params.lang : defaultLocale;
}

/**
 * Prefixes an internal path with a locale. External URLs, anchors, `mailto:`
 * and `tel:` are returned untouched, so this is safe to apply blindly.
 */
export function localeHref(href: string, locale: Locale): string {
  if (!href.startsWith("/")) return href;
  // The API tree is deliberately not localized.
  if (href.startsWith("/api/")) return href;
  return `/${locale}${href === "/" ? "" : href}`;
}

/**
 * `next/link` that keeps the visitor in their language.
 *
 * Used in place of `next/link` everywhere inside `app/[lang]`, so no page has
 * to remember to write the prefix into its `href`.
 */
export default function Link({
  href,
  ...rest
}: Omit<ComponentProps<typeof NextLink>, "href"> & { href: string }) {
  const locale = useLocale();
  return <NextLink href={localeHref(href, locale)} {...rest} />;
}
