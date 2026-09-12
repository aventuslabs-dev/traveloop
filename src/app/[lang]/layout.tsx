import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DM_Sans, Noto_Sans_SC, Playfair_Display, Sora } from "next/font/google";
import "@/app/globals.css";
import { getDictionary } from "@/i18n/dictionaries";
import { htmlLang, isLocale, locales, ogLocale, type Locale } from "@/i18n/config";
import LanguageBanner from "@/app/components/LanguageBanner";

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

const SITE_URL = "https://traveloop.my";

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
      images: ["/hero3.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: common.site.title,
      description: common.site.description,
      images: ["/hero3.png"],
    },
    robots: { index: true, follow: true },
  };
}

/**
 * Entity facts for AI assistants and search engines: who Traveloop is, where
 * it operates, and what it sells. Kept in the root layout so it appears on
 * every page rather than only the homepage. The prose fields follow the
 * locale; the address and contact details are the same in both.
 */
const organizationJsonLd = (lang: Locale, name: string, description: string) => ({
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  "@id": `${SITE_URL}/#organization`,
  name,
  description,
  url: `${SITE_URL}/${lang}`,
  logo: `${SITE_URL}/traveloop-logo.webp`,
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
  foundingDate: "2026",
});

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              organizationJsonLd(lang, common.site.name, common.site.description)
            ),
          }}
        />
        {children}
        <LanguageBanner lang={lang} />
      </body>
    </html>
  );
}
