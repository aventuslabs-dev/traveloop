import { pageMetadata } from "@/i18n/metadata";
import type { LangParams } from "@/i18n/page";

export async function generateMetadata({ params }: LangParams) {
  return pageMetadata(params, "/passes", (dict) => dict.passes.meta);
}

export default function PassesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
