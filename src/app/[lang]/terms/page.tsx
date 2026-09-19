import LegalDocument from "@/app/components/LegalDocument";
import { localePage, type LangParams } from "@/i18n/page";
import { pageMetadata } from "@/i18n/metadata";

export async function generateMetadata({ params }: LangParams) {
  return pageMetadata(params, "/terms", (dict) => dict.terms.meta);
}

/**
 * The date the English terms were last revised. Kept out of the dictionaries
 * on purpose: it describes the document, not the translation, so it must not
 * be able to differ between locales.
 */
const LAST_UPDATED = "16 August 2026";

export default async function TermsPage({ params }: LangParams) {
  const { dict } = await localePage(params);

  return <LegalDocument doc={dict.terms} lastUpdated={LAST_UPDATED} common={dict.common} />;
}
