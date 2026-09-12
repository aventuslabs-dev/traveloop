import type { MetadataRoute } from "next";
import { blogPosts } from "./data/blog";
import { htmlLang, locales } from "@/i18n/config";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://traveloop.my";

/** Routes without a locale prefix, with the priority each carries. */
const staticPaths: { path: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/passes", changeFrequency: "weekly", priority: 0.9 },
  { path: "/partners", changeFrequency: "weekly", priority: 0.8 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/blogs", changeFrequency: "weekly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

/**
 * Every page is listed once per locale, and each entry carries the full set of
 * `alternates` so a crawler that finds one language is told about the other.
 * Without that, the two sites look like unrelated duplicates competing for the
 * same queries rather than translations of each other.
 */
function alternatesFor(path: string) {
  return {
    languages: Object.fromEntries(
      locales.map((locale) => [htmlLang[locale], `${SITE_URL}/${locale}${path}`])
    ),
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  // Only posts with body content have a readable article page.
  const articlePaths = blogPosts
    .filter((post) => post.body)
    .map((post) => ({
      path: `/blogs/${post.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

  return [...staticPaths, ...articlePaths].flatMap((entry) =>
    locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${entry.path}`,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: alternatesFor(entry.path),
    }))
  );
}
