import { blogCategories, getBlogCategoryLabels, getBlogPosts } from "@/app/data/blog";
import { localePage, type LangParams } from "@/i18n/page";
import JsonLd from "@/app/components/JsonLd";
import { breadcrumbJsonLd, jsonLdGraph } from "@/lib/seo";
import BlogsIndex from "./BlogsIndex";

export default async function BlogsPage({ params }: LangParams) {
  const { lang, dict } = await localePage(params);

  return (
    <>
      {/* The same trail each article carries, one level up. */}
      <JsonLd
        json={jsonLdGraph(
          breadcrumbJsonLd(lang, dict.common.nav.home, [
            { name: dict.common.nav.blogs, path: "/blogs" },
          ])
        )}
      />
      <BlogsIndex
      posts={await getBlogPosts(lang)}
      categories={blogCategories}
      categoryLabels={await getBlogCategoryLabels(lang)}
      dict={dict.blogs}
      nav={dict.common.nav}
      language={dict.common.language}
        footer={dict.common.footer}
      />
    </>
  );
}
