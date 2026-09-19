import type { Metadata } from "next";
import LegalDocument from "@/app/components/LegalDocument";
import { localePage, type LangParams } from "@/i18n/page";
import { pageMetadata } from "@/i18n/metadata";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  return pageMetadata(params, "/privacy", (dict) => dict.privacy.meta);
}

/**
 * The date the English policy was last revised. Kept out of the dictionaries
 * on purpose: it describes the document, not the translation, so it must not
 * be able to differ between locales.
 *
 * Change this whenever section 2, 5 or 8 changes — those are the ones that
 * describe what is collected, who receives it and how long it is kept, and a
 * stale date beside a changed answer is the part a regulator would read as
 * misleading.
 */
const LAST_UPDATED = "19 September 2026";

export default async function PrivacyPage({ params }: LangParams) {
  const { dict } = await localePage(params);

  return (
    <LegalDocument doc={dict.privacy} lastUpdated={LAST_UPDATED} common={dict.common} />
  );
}
