import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://traveloop.my";

/**
 * Private, transactional or placeholder routes. Written without a locale
 * prefix here and expanded below — every one of these now lives under /en and
 * /cn, and a bare "/account" rule would no longer match anything.
 */
const privatePaths = ["/account", "/admin", "/passes/register", "/passes/success"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        // /api serves attachments and JSON, not pages, and is never localized.
        "/api",
        ...locales.flatMap((locale) => privatePaths.map((path) => `/${locale}${path}`)),
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
