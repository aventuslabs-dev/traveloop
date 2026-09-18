import { localePage, type LangParams } from "@/i18n/page";
import JsonLd from "@/app/components/JsonLd";
import { breadcrumbJsonLd, jsonLdGraph } from "@/lib/seo";
import ContactPageClient from "./ContactPageClient";

export default async function ContactPage({ params }: LangParams) {
  const { lang, dict } = await localePage(params);

  return (
    <>
      <JsonLd
        json={jsonLdGraph(
          breadcrumbJsonLd(lang, dict.common.nav.home, [
            { name: dict.common.nav.contact, path: "/contact" },
          ])
        )}
      />
      <ContactPageClient
        dict={dict.contact}
        nav={dict.common.nav}
        language={dict.common.language}
        footer={dict.common.footer}
      />
    </>
  );
}
