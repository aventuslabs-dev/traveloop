import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";
import { getDictionary, type Dictionary } from "./dictionaries";

/** The `params` shape every page and layout under `app/[lang]` receives. */
export type LangParams = { params: Promise<{ lang: string }> };

/**
 * Resolves the `[lang]` segment and loads its dictionary, 404-ing on anything
 * that is not a locale we ship.
 *
 * The 404 matters: `[lang]` matches any single segment, so without it a typo
 * like /enn/passes would render the English page under a junk URL and search
 * engines would index it.
 */
export async function localePage(
  params: LangParams["params"]
): Promise<{ lang: Locale; dict: Dictionary }> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return { lang, dict: await getDictionary(lang) };
}
