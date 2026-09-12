import { pageMetadata } from "@/i18n/metadata";
import type { LangParams } from "@/i18n/page";

export async function generateMetadata({ params }: LangParams) {
  return pageMetadata(params, "/contact", (dict) => dict.contact.meta);
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
