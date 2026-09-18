import { htmlLang, locales, type Locale } from "@/i18n/config";

/**
 * The origin every absolute URL in metadata, structured data, the sitemap and
 * robots.txt is built from.
 *
 * One definition for all of them on purpose: a canonical that says
 * `traveloop.my` while the sitemap lists a preview host tells a crawler the
 * two are different sites. `NEXT_PUBLIC_SITE_URL` is what deployments set
 * (Stripe needs it too), and the literal is the production fallback for a
 * local run that never set it.
 */
function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (!configured) return "https://traveloop.my";

  try {
    return new URL(configured).origin;
  } catch {
    return "https://traveloop.my";
  }
}

export const SITE_URL = resolveSiteUrl();

/** `/en/passes` -> `https://traveloop.my/en/passes`. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/**
 * The card Facebook, WhatsApp, LinkedIn, Slack and X show for a shared link.
 *
 * 1200x630 is the frame all of them crop to, and the file is kept well under
 * a megabyte — WhatsApp abandons the fetch on large images and falls back to
 * a bare grey link. Regenerate it with `scripts/generate-brand-assets.mjs`.
 */
export const OG_IMAGE = {
  url: "/og-traveloop.jpg",
  width: 1200,
  height: 630,
} as const;

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

type JsonLdNode = Record<string, unknown>;

/**
 * Who Traveloop is, as a machine-readable entity: the facts a search engine or
 * an AI assistant needs to answer "what is Traveloop and where is it" without
 * guessing from prose.
 *
 * `@id` is stable across locales so both language versions describe the *same*
 * company rather than two similarly named ones; only the prose follows the
 * locale.
 */
export function organizationJsonLd(
  lang: Locale,
  name: string,
  description: string
): JsonLdNode {
  return {
    "@type": "TravelAgency",
    "@id": ORGANIZATION_ID,
    name,
    description,
    url: absoluteUrl(`/${lang}`),
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/traveloop-logo.webp"),
      width: 1280,
      height: 345,
    },
    image: absoluteUrl(OG_IMAGE.url),
    email: "partnership@traveloop.my",
    telephone: "+601139492888",
    inLanguage: htmlLang[lang],
    areaServed: { "@type": "Country", name: "Malaysia" },
    address: {
      "@type": "PostalAddress",
      streetAddress: "50, Jalan Khaw Sim Bee",
      addressLocality: "Georgetown",
      postalCode: "10400",
      addressRegion: "Pulau Pinang",
      addressCountry: "MY",
    },
    /**
     * The addresses the site itself publishes, and nothing else — an invented
     * support alias in structured data is a bounced email, not a better
     * result. `hello@` is the one on the contact page; `partnership@` is the
     * one in the footer.
     */
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: "hello@traveloop.my",
        telephone: "+601139492888",
        areaServed: "MY",
        availableLanguage: locales.map((locale) => htmlLang[locale]),
      },
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: "partnership@traveloop.my",
        areaServed: "MY",
        availableLanguage: locales.map((locale) => htmlLang[locale]),
      },
    ],
    foundingDate: "2026",
    // No `sameAs`: it is for profiles of this company elsewhere, and the
    // social accounts in the footer are still "coming soon". Listing the
    // site's own URLs there would claim nothing.
  };
}

/** The site itself, tied back to the company that publishes it. */
export function websiteJsonLd(lang: Locale, name: string, description: string): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name,
    description,
    url: absoluteUrl(`/${lang}`),
    inLanguage: htmlLang[lang],
    publisher: { "@id": ORGANIZATION_ID },
  };
}

/**
 * The trail shown under a search result. `position` is 1-based and the list
 * must start at the site root, so callers pass only the steps below it.
 */
export function breadcrumbJsonLd(
  lang: Locale,
  homeName: string,
  trail: { name: string; path: string }[]
): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: homeName, path: "" }, ...trail].map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(`/${lang}${crumb.path}`),
    })),
  };
}

export type ArticleSeo = {
  slug: string;
  title: string;
  excerpt: string;
  /**
   * Cover art, widest crop first. Search engines pick between aspect ratios
   * depending on where they show the result, so the card crop and the full
   * original are both offered rather than one being chosen for them.
   */
  images: string[];
  published: string;
  /** Falls back to `published` for a post that has never been revised. */
  updated?: string;
  author: { name: string; kind: "person" | "organization" };
  section: string;
};

/**
 * A blog post as an article rather than an anonymous page — this is what puts
 * a date and a byline next to the result and makes the piece quotable by
 * assistants that cite sources.
 */
export function articleJsonLd(lang: Locale, article: ArticleSeo): JsonLdNode {
  const url = absoluteUrl(`/${lang}/blogs/${article.slug}`);

  return {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: article.title,
    description: article.excerpt,
    image: article.images.map(absoluteUrl),
    datePublished: article.published,
    dateModified: article.updated ?? article.published,
    articleSection: article.section,
    inLanguage: htmlLang[lang],
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author:
      article.author.kind === "organization"
        ? { "@id": ORGANIZATION_ID }
        : { "@type": "Person", name: article.author.name },
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export type ProductSeo = {
  key: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
};

/** One pass tier, priced. `priceCurrency` must be the uppercase ISO code. */
export function productJsonLd(lang: Locale, product: ProductSeo): JsonLdNode {
  const url = absoluteUrl(`/${lang}/passes`);

  return {
    "@type": "Product",
    "@id": `${url}#${product.key}`,
    name: product.name,
    description: product.description,
    image: absoluteUrl("/malaysia-card-front.webp"),
    brand: { "@type": "Brand", name: "Traveloop" },
    category: "Travel pass",
    offers: {
      "@type": "Offer",
      url,
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: product.currency.toUpperCase(),
      availability: "https://schema.org/InStock",
      seller: { "@id": ORGANIZATION_ID },
    },
  };
}

/** Questions and answers exactly as the page shows them — never a summary. */
export function faqJsonLd(items: { question: string; answer: string }[]): JsonLdNode {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/**
 * Wraps nodes into the single `@graph` document a page emits. One script with
 * cross-referenced `@id`s is read as one connected description; several loose
 * scripts are read as unrelated fragments.
 */
export function jsonLdGraph(...nodes: JsonLdNode[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes });
}
