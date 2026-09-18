import type { MetadataRoute } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { defaultLocale, htmlLang } from "@/i18n/config";

/**
 * Served at /manifest.webmanifest — what a phone reads when someone adds the
 * site to their home screen, and one of the things a search engine checks for
 * installability.
 *
 * It sits outside `[lang]`, so it can only speak one language: the default
 * one. `start_url` therefore points at `/en` rather than a bare `/`, which
 * would bounce the visitor through the locale redirect on every launch.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { common } = await getDictionary(defaultLocale);

  return {
    name: common.site.title,
    short_name: common.site.name,
    description: common.site.description,
    lang: htmlLang[defaultLocale],
    start_url: `/${defaultLocale}`,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbfaf7",
    theme_color: "#244798",
    categories: ["travel", "lifestyle", "shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Android crops icons to its own shape; the maskable copy carries the
      // padding that keeps the plane out of the crop.
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
