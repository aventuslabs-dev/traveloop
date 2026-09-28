import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { SITE_URL } from "@/lib/seo";

/**
 * Private, transactional or placeholder routes. Written without a locale
 * prefix here and expanded below — every one of these now lives under /en and
 * /cn, and a bare "/account" rule would no longer match anything.
 *
 * The Urban Sprint entries are the campaign's signed-in consoles. Its public
 * landing page and leaderboard stay crawlable; a team's own board, the
 * gamemaster's station list and the organiser's control panel do not belong in
 * anyone's search results even though a role check already turns crawlers away.
 */
const privatePaths = [
  "/account",
  "/admin",
  "/passes/register",
  "/passes/success",
  "/urban-sprint/admin",
  "/urban-sprint/gamemaster",
  "/urban-sprint/t/",
  "/urban-sprint/login",
];

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
