import type { Metadata } from "next";
import PagePlaceholder from "@/app/components/PagePlaceholder";
import { localePage, type LangParams } from "@/i18n/page";
import { pageMetadata } from "@/i18n/metadata";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  return {
    ...(await pageMetadata(params, "/privacy", (dict) => dict.privacy.meta)),
    // Placeholder content — keep it out of the index until the real policy lands.
    robots: { index: false, follow: true },
  };
}

export default async function PrivacyPage({ params }: LangParams) {
  const { dict } = await localePage(params);

  return (
    <PagePlaceholder
      eyebrow={dict.privacy.eyebrow}
      title={dict.privacy.title}
      body={dict.privacy.body}
      nav={dict.common.nav}
      language={dict.common.language}
    />
  );
}
