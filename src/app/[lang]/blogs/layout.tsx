import { pageMetadata } from "@/i18n/metadata";
import type { LangParams } from "@/i18n/page";

export async function generateMetadata({ params }: LangParams) {
  return pageMetadata(params, "/blogs", (dict) => dict.blogs.meta);
}

export default function BlogsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
