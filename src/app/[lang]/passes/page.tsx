import { getPassComparison, getPassTiers, PASS_CURRENCY } from "@/app/data/passes";
import { localePage, type LangParams } from "@/i18n/page";
import JsonLd from "@/app/components/JsonLd";
import { breadcrumbJsonLd, faqJsonLd, jsonLdGraph, productJsonLd } from "@/lib/seo";
import PassesPageClient from "./PassesPageClient";

export default async function PassesPage({ params }: LangParams) {
  const { lang, dict } = await localePage(params);
  const tiers = getPassTiers(lang);

  return (
    <>
      {/*
        The three tiers as priced products, plus the questions this page
        already answers in full. Both are read straight off the page's own
        copy — structured data that says anything the visitor cannot see is
        the one thing search engines penalise outright.
      */}
      <JsonLd
        json={jsonLdGraph(
          ...tiers.map((tier) =>
            productJsonLd(lang, {
              key: tier.key,
              name: `Traveloop ${tier.name} Pass`,
              // The bullets as read on the card. They are fragments, so they
              // are joined into sentences rather than run together.
              description: `${tier.highlights.join(". ")}.`,
              priceCents: tier.priceCents,
              currency: PASS_CURRENCY,
            })
          ),
          faqJsonLd(Object.values(dict.passes.faq.items)),
          breadcrumbJsonLd(lang, dict.common.nav.home, [
            { name: dict.common.nav.purchasePass, path: "/passes" },
          ])
        )}
      />
      <PassesPageClient
        tiers={tiers}
        comparison={getPassComparison(lang)}
        dict={dict.passes}
        nav={dict.common.nav}
        language={dict.common.language}
        footer={dict.common.footer}
      />
    </>
  );
}
