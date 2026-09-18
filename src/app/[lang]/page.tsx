import { getPartners } from "@/app/data/partners";
import { getPassTiers } from "@/app/data/passes";
import { localePage, type LangParams } from "@/i18n/page";
import { pageMetadata } from "@/i18n/metadata";
import JsonLd from "@/app/components/JsonLd";
import { faqJsonLd, jsonLdGraph } from "@/lib/seo";
import HomePage from "./HomePage";

export async function generateMetadata({ params }: LangParams) {
  const meta = await pageMetadata(params, "/", (dict) => dict.home.meta);
  // The homepage owns its whole title rather than filling the "%s" slot.
  return { ...meta, title: { absolute: (await localePage(params)).dict.home.meta.title } };
}

export default async function Page({ params }: LangParams) {
  const { lang, dict } = await localePage(params);

  return (
    <>
      {/*
        The FAQ section further down this page, verbatim. Emitted here rather
        than inside HomePage: that component is a client one, and shipping the
        questions twice — once as markup, once as a JSON string in the bundle —
        pays for the same words twice.
      */}
      <JsonLd json={jsonLdGraph(faqJsonLd(Object.values(dict.home.faq.items)))} />
      <HomePage
        dict={dict.home}
        nav={dict.common.nav}
        language={dict.common.language}
        footer={dict.common.footer}
        tiers={getPassTiers(lang)}
        partners={await getPartners(lang)}
      />
    </>
  );
}
