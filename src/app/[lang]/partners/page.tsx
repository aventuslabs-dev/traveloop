import { getPartners } from "@/app/data/partners";
import { localePage, type LangParams } from "@/i18n/page";
import PartnersDirectory from "./PartnersDirectory";

/**
 * Server half of the partners page: resolves the locale, loads the dictionary
 * and the localized partner list, then hands both to the client component that
 * owns the category filter.
 *
 * Splitting it this way keeps the dictionary on the server — only the handful
 * of strings this page actually renders crosses into the browser bundle.
 */
export default async function PartnersPage({ params }: LangParams) {
  const { lang, dict } = await localePage(params);
  const partners = await getPartners(lang);

  return (
    <PartnersDirectory
      partners={partners}
      dict={dict.partners}
      nav={dict.common.nav}
      language={dict.common.language}
      footer={dict.common.footer}
    />
  );
}
