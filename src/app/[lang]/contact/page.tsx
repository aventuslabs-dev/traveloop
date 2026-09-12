import { localePage, type LangParams } from "@/i18n/page";
import ContactPageClient from "./ContactPageClient";

export default async function ContactPage({ params }: LangParams) {
  const { dict } = await localePage(params);

  return (
    <ContactPageClient
      dict={dict.contact}
      nav={dict.common.nav}
      language={dict.common.language}
      footer={dict.common.footer}
    />
  );
}
