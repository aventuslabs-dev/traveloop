import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { htmlLang, isLocale, locales, ogLocale, type Locale } from "./config";
import { getDictionary, type Dictionary } from "./dictionaries";
import { OG_IMAGE } from "@/lib/seo";

export type PageMeta = {
  title: string;
  description: string;
  /** Falls back to `title` / `description` when a page wants the same text. */
  ogTitle?: string;
  ogDescription?: string;
};

/** A share image that isn't the site-wide card — a blog post's cover, say. */
export type SocialImage = {
  url: string;
  width?: number;
  height?: number;
  alt: string;
};

type PageMetadataOptions = {
  /** Overrides the site-wide 1200x630 card. */
  image?: SocialImage;
  /** `article` for blog posts; everything else is a `website`. */
  type?: "website" | "article";
  publishedTime?: string;
  authors?: string[];
  section?: string;
};

/**
 * The canonical URL and the hreflang set for one route in one locale.
 *
 * Split out of `pageMetadata` for the pages whose copy isn't in the
 * dictionaries — the Urban Sprint campaign writes its own titles but still
 * needs to tell crawlers which URL is the real one and where its twin lives.
 */
export function localeAlternates(lang: Locale, path: string): Metadata["alternates"] {
  const suffix = path === "/" ? "" : path;

  return {
    canonical: `/${lang}${suffix}`,
    languages: {
      ...Object.fromEntries(
        locales.map((locale) => [htmlLang[locale], `/${locale}${suffix}`])
      ),
      "x-default": `/en${suffix}`,
    },
  };
}

/**
 * Per-page metadata with the canonical, hreflang and share card set for this
 * locale.
 *
 * Every localized page needs its *own* hreflang pair — the root layout's set
 * only points at the two homepages, which would tell search engines that the
 * Chinese homepage is the alternate of the English partners page. `path` is
 * the route without a locale prefix, e.g. "/partners".
 *
 * `openGraph` and `twitter` are written out in full rather than leaning on the
 * root layout's: Next merges metadata *shallowly*, so a page that sets
 * `openGraph` at all replaces the parent's entire object. Setting only a title
 * here would strip the image, the type and the site name from every page but
 * the homepage, and leave the Twitter card advertising the site description
 * instead of the page's.
 */
export async function pageMetadata(
  params: Promise<{ lang: string }>,
  path: string,
  pick: (dict: Dictionary) => PageMeta,
  options: PageMetadataOptions = {}
): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const meta = pick(dict);
  const suffix = path === "/" ? "" : path;

  const title = meta.ogTitle ?? meta.title;
  const description = meta.ogDescription ?? meta.description;
  const image = options.image ?? {
    ...OG_IMAGE,
    alt: dict.common.site.ogImageAlt,
  };

  // `type` discriminates the OpenGraph union, so the two shapes are built
  // apart rather than spread together behind a conditional.
  const shared = {
    siteName: dict.common.site.name,
    title,
    description,
    url: `/${lang}${suffix}`,
    locale: ogLocale[lang],
    images: [image],
  };

  const openGraph: Metadata["openGraph"] =
    options.type === "article"
      ? {
          ...shared,
          type: "article",
          publishedTime: options.publishedTime,
          authors: options.authors,
          section: options.section,
        }
      : { ...shared, type: "website" };

  return {
    title: meta.title,
    description: meta.description,
    alternates: localeAlternates(lang, path),
    openGraph,
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
