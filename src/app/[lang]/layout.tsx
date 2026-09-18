import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { DM_Sans, Noto_Sans_SC, Playfair_Display, Sora } from "next/font/google";
import "@/app/globals.css";
import { getDictionary } from "@/i18n/dictionaries";
import { htmlLang, isLocale, locales, ogLocale } from "@/i18n/config";
import LanguageBanner from "@/app/components/LanguageBanner";
import JsonLd from "@/app/components/JsonLd";
import {
  jsonLdGraph,
  OG_IMAGE,
  organizationJsonLd,
  SITE_URL,
  websiteJsonLd,
} from "@/lib/seo";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600"],
  style: ["normal", "italic"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/**
 * The Latin display faces above carry no CJK glyphs, so Chinese set in them
 * falls back per-device and the page stops looking like one design. Noto Sans
 * SC is loaded for the Chinese locale and slotted ahead of the platform faces
 * in `--font-cjk` (see globals.css). Google serves it in unicode-range slices,
 * so an English visitor downloads none of it.
 */
const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const { common } = await getDictionary(lang);

  return {
    metadataBase: new URL(SITE_URL),
    // Per-page titles fill the "%s" slot; the homepage overrides with `absolute`.
    title: {
      default: common.site.title,
      template: common.site.titleTemplate,
    },
    description: common.site.description,
    applicationName: common.site.name,
    alternates: {
      canonical: `/${lang}`,
      // Tells search engines these are the same page in two languages rather
      // than duplicate content, and which to serve to whom.
      languages: {
        ...Object.fromEntries(
          locales.map((locale) => [htmlLang[locale], `/${locale}`])
        ),
        "x-default": "/en",
      },
    },
    openGraph: {
      type: "website",
      siteName: common.site.name,
      locale: ogLocale[lang],
      url: `/${lang}`,
      title: common.site.title,
      description: common.site.description,
      images: [{ ...OG_IMAGE, alt: common.site.ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: common.site.title,
      description: common.site.description,
      images: [{ ...OG_IMAGE, alt: common.site.ogImageAlt }],
    },
    /**
     * Declared rather than left to the `app/icon.*` file conventions: this
     * root layout sits inside `[lang]`, so a convention file would be resolved
     * per locale segment. Listing them here emits one set of tags for every
     * route, whatever its prefix.
     *
     * The SVG comes first and modern browsers stop there; `favicon.ico` is the
     * fallback for the ones that don't read SVG, and for the bare
     * `/favicon.ico` request browsers make with no tag at all.
     */
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "48x48" },
      ],
      apple: { url: "/apple-icon.png", sizes: "180x180" },
    },
    manifest: "/manifest.webmanifest",
    robots: {
      index: true,
      follow: true,
      // Lets Google show full-length previews and large image thumbnails
      // instead of the short snippet it defaults to for some regions.
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
  };
}

/**
 * Tints the browser chrome on Android and the iOS status bar to the brand
 * blue. Separate from `metadata` because Next moved viewport-level tags into
 * their own export.
 */
export const viewport: Viewport = {
  themeColor: "#244798",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const { common } = await getDictionary(lang);

  return (
    <html
      lang={htmlLang[lang]}
      data-scroll-behavior="smooth"
      className={`${dmSans.variable} ${playfairDisplay.variable} ${sora.variable} ${notoSansSC.variable}`}
    >
      <body>
        {/*
          Who Traveloop is and what this site is, on every page rather than
          only the homepage — a crawler that lands on an article should still
          learn which company published it. Pages add their own nodes (an
          article, a pass, an FAQ) that point back at these by `@id`.
        */}
        <JsonLd
          json={jsonLdGraph(
            organizationJsonLd(lang, common.site.name, common.site.description),
            websiteJsonLd(lang, common.site.name, common.site.description)
          )}
        />
        {children}
        <LanguageBanner lang={lang} />
      </body>
    </html>
  );
}
