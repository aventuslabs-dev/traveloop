import { pageMetadata } from "@/i18n/metadata";
import type { LangParams } from "@/i18n/page";

export async function generateMetadata({ params }: LangParams) {
  return pageMetadata(params, "/partners", (dict) => dict.partners.meta);
}

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
