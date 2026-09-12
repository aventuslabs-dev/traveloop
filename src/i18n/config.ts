/**
 * The two locales the site ships in, and the mapping between the URL segment
 * and the language tags the rest of the web expects.
 *
 * The URL segment for Chinese is `cn` because that is what the marketing side
 * asked for, but `cn` is a *country* code, not a language one. Everywhere a
 * real language tag is required — `<html lang>`, hreflang, OpenGraph, the
 * `Accept-Language` match, `Intl` formatting — `zh-Hans` is used instead, via
 * the maps below. Never write the raw segment into those places.
 */

export const locales = ["en", "cn"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Remembers the visitor's choice so a bare `/` can send them back to it. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** One year — the choice should outlast a whole holiday-planning cycle. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** BCP 47 tag for `<html lang>`, `hreflang`, and `Intl`. */
export const htmlLang: Record<Locale, string> = {
  en: "en",
  cn: "zh-Hans",
};

/** Underscored form OpenGraph wants. */
export const ogLocale: Record<Locale, string> = {
  en: "en_MY",
  cn: "zh_CN",
};

/** What the language shows itself as. Autonyms are never translated. */
export const localeLabel: Record<Locale, string> = {
  en: "EN",
  cn: "中文",
};

/** Long form, for `aria-label` and the first-visit banner. */
export const localeName: Record<Locale, string> = {
  en: "English",
  cn: "中文",
};

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (locales as readonly string[]).includes(value);
}

/**
 * Splits a pathname into its locale prefix and the rest. Returns a `null`
 * locale for paths that carry no prefix yet, so callers can tell "no locale"
 * apart from "the default locale".
 */
export function splitLocale(pathname: string): {
  locale: Locale | null;
  rest: string;
} {
  const [, first = "", ...others] = pathname.split("/");

  if (!isLocale(first)) return { locale: null, rest: pathname };

  const rest = `/${others.join("/")}`;
  return { locale: first, rest: rest === "/" ? "/" : rest.replace(/\/$/, "") };
}

/** The pathname with any existing locale prefix replaced by `locale`. */
export function localizePath(pathname: string, locale: Locale): string {
  const { rest } = splitLocale(pathname);
  const suffix = rest === "/" ? "" : rest;
  return `/${locale}${suffix}`;
}

/**
 * `navigator.language` prefixes that mean "this person probably reads this
 * locale". Used only by the first-visit banner to decide whether to *offer* a
 * switch — never to redirect anyone automatically.
 *
 * `zh` covers zh-CN, zh-SG, zh-TW and zh-HK alike. Traditional-script readers
 * are offered the Simplified site knowingly: it is far closer to readable for
 * them than English, and they can dismiss it.
 */
export const browserLanguagePrefixes: Record<Locale, string[]> = {
  en: ["en"],
  cn: ["zh"],
};
