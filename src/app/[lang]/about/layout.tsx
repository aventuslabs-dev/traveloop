import { pageMetadata } from "@/i18n/metadata";
import type { LangParams } from "@/i18n/page";

export async function generateMetadata({ params }: LangParams) {
  return pageMetadata(params, "/about", (dict) => dict.about.meta);
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
