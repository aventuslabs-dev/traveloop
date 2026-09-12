import { getPassComparison, getPassTiers } from "@/app/data/passes";
import { localePage, type LangParams } from "@/i18n/page";
import PassesPageClient from "./PassesPageClient";

export default async function PassesPage({ params }: LangParams) {
  const { lang, dict } = await localePage(params);

  return (
    <PassesPageClient
      tiers={getPassTiers(lang)}
      comparison={getPassComparison(lang)}
      dict={dict.passes}
      nav={dict.common.nav}
      language={dict.common.language}
      footer={dict.common.footer}
    />
  );
}
