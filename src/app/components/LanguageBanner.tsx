import { getDictionary } from "@/i18n/dictionaries";
import { browserLanguagePrefixes, htmlLang, locales, type Locale } from "@/i18n/config";
import LanguageBannerClient, { type BannerAlternate } from "./LanguageBannerClient";

/**
 * Offers the site in the visitor's own language on their first visit.
 *
 * Each locale's dictionary holds the invitation *into* that locale — the
 * Chinese strings are what a Chinese speaker sees while they are still on the
 * English page — so this loads the other locales' dictionaries, not its own.
 */
export default async function LanguageBanner({ lang }: { lang: Locale }) {
  const alternates: BannerAlternate[] = await Promise.all(
    locales
      .filter((locale) => locale !== lang)
      .map(async (locale) => {
        const { common } = await getDictionary(locale);
        return {
          locale,
          lang: htmlLang[locale],
          prefixes: browserLanguagePrefixes[locale],
          text: common.language.bannerText,
          action: common.language.bannerAction,
          dismiss: common.language.bannerDismiss,
        };
      })
  );

  return <LanguageBannerClient alternates={alternates} />;
}
