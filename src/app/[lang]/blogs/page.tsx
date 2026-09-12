import { blogCategories, getBlogCategoryLabels, getBlogPosts } from "@/app/data/blog";
import { localePage, type LangParams } from "@/i18n/page";
import BlogsIndex from "./BlogsIndex";

export default async function BlogsPage({ params }: LangParams) {
  const { lang, dict } = await localePage(params);

  return (
    <BlogsIndex
      posts={await getBlogPosts(lang)}
      categories={blogCategories}
      categoryLabels={await getBlogCategoryLabels(lang)}
      dict={dict.blogs}
      nav={dict.common.nav}
      language={dict.common.language}
      footer={dict.common.footer}
    />
  );
}
