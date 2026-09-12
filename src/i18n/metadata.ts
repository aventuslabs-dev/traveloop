import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { htmlLang, isLocale, locales, ogLocale } from "./config";
import { getDictionary, type Dictionary } from "./dictionaries";

export type PageMeta = {
  title: string;
  description: string;
  /** Falls back to `title` / `description` when a page wants the same text. */
  ogTitle?: string;
  ogDescription?: string;
};

/**
 * Per-page metadata with the canonical and hreflang set for this locale.
 *
 * Every localized page needs its *own* hreflang pair — the root layout's set
 * only points at the two homepages, which would tell search engines that the
 * Chinese homepage is the alternate of the English partners page. `path` is
 * the route without a locale prefix, e.g. "/partners".
 */
export async function pageMetadata(
  params: Promise<{ lang: string }>,
  path: string,
  pick: (dict: Dictionary) => PageMeta
): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const meta = pick(await getDictionary(lang));
  const suffix = path === "/" ? "" : path;

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${lang}${suffix}`,
      languages: {
        ...Object.fromEntries(
          locales.map((locale) => [htmlLang[locale], `/${locale}${suffix}`])
        ),
        "x-default": `/en${suffix}`,
      },
    },
    openGraph: {
      title: meta.ogTitle ?? meta.title,
      description: meta.ogDescription ?? meta.description,
      url: `/${lang}${suffix}`,
      locale: ogLocale[lang],
    },
  };
}
