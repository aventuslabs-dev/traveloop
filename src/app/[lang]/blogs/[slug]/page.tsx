import Image from "next/image";
import Link from "@/i18n/Link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icon } from "@/app/components/Icons";
import {
  blogPosts,
  getBlogPosts,
  getLocalizedPostBySlug,
  type BlogBlock,
  type LocalizedBlogPost,
} from "@/app/data/blog";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, locales } from "@/i18n/config";
import { localePage } from "@/i18n/page";
import { pageMetadata } from "@/i18n/metadata";
import JsonLd from "@/app/components/JsonLd";
import { articleJsonLd, breadcrumbJsonLd, jsonLdGraph } from "@/lib/seo";

type ArticleParams = { params: Promise<{ lang: string; slug: string }> };

/**
 * One entry per article per locale. The slug is shared, so both locales
 * prerender the same set of URLs under their own prefix and the switcher can
 * move between them without a lookup table.
 */
export function generateStaticParams() {
  return locales.flatMap((lang) =>
    blogPosts.filter((p) => p.body).map((p) => ({ lang, slug: p.slug }))
  );
}

export async function generateMetadata({ params }: ArticleParams): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const post = await getLocalizedPostBySlug(slug, lang);
  if (!post?.body) {
    const { common } = await getDictionary(lang);
    return { title: common.notFound.title, robots: { index: false, follow: true } };
  }

  // The article's own cover makes the better share card, when one has been
  // cropped to the card frame — alt text included, since a link preview is
  // read aloud as often as it is looked at. Without one the helper falls back
  // to the site-wide card rather than shipping a mis-cropped photo.
  return pageMetadata(
    params,
    `/blogs/${post.slug}`,
    () => ({ title: post.title, description: post.excerpt }),
    {
      type: "article",
      image: post.ogImage
        ? { url: post.ogImage, width: 1200, height: 630, alt: post.title }
        : undefined,
      publishedTime: post.published,
      authors: [post.author.name],
      section: post.categoryLabel,
    }
  );
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "lead":
      return <p className="article-lead">{block.text}</p>;
    case "para":
      return <p>{block.text}</p>;
    case "heading":
      return <h2>{block.text}</h2>;
    case "subheading":
      return <h3>{block.text}</h3>;
    case "image":
      return (
        <div className="article-image-wrap">
          <Image
            className="article-image"
            src={block.src}
            alt={block.alt}
            fill
            sizes="(max-width: 720px) 100vw, 720px"
          />
        </div>
      );
    case "list":
      return (
        <ul className="article-list">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "phrases":
      return (
        <ol className="phrase-list">
          {block.items.map((phrase) => (
            <li className="phrase-card" key={phrase.malay}>
              <p className="phrase-malay">{phrase.malay}</p>
              <p className="phrase-english">{phrase.english}</p>
              <p className="phrase-note">{phrase.note}</p>
            </li>
          ))}
        </ol>
      );
    case "callout":
      return (
        <aside className="article-callout">
          <p>{block.text}</p>
          {block.cta && (
            <Link className="button primary" href={block.cta.href}>
              {block.cta.label}
            </Link>
          )}
        </aside>
      );
  }
}

function RelatedCard({ post }: { post: LocalizedBlogPost }) {
  const inner = (
    <>
      <div className="blog-card-image">
        <Image src={post.img} alt="" fill sizes="(max-width: 862px) 100vw, 33vw" />
      </div>
      <div className="blog-card-body">
        <span className="blog-tag">{post.categoryLabel}</span>
        <h3>{post.title}</h3>
        <p>{post.excerpt}</p>
        <div className="blog-card-footer">
          <div className="blog-meta">
            <span>{post.date}</span>
            <span>{post.readTime}</span>
          </div>
        </div>
      </div>
    </>
  );

  return post.body ? (
    <Link className="blog-card blog-card-link" href={`/blogs/${post.slug}`}>
      {inner}
    </Link>
  ) : (
    <article className="blog-card">{inner}</article>
  );
}

export default async function BlogPostPage({ params }: ArticleParams) {
  const { lang, dict } = await localePage(params);
  const { slug } = await params;

  const post = await getLocalizedPostBySlug(slug, lang);
  if (!post?.body) notFound();

  const related = (await getBlogPosts(lang))
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);
  const t = dict.blogs;

  return (
    <>
      {/*
        The article as an entity: a headline, a byline, a date and the company
        that published it, tied to the Organization node the root layout emits.
        The breadcrumb repeats the path the nav already shows, which is what a
        result gets to display instead of a bare URL.
      */}
      <JsonLd
        json={jsonLdGraph(
          articleJsonLd(lang, {
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            images: post.ogImage ? [post.ogImage, post.img] : [post.img],
            published: post.published,
            updated: post.updated,
            author: post.author,
            section: post.categoryLabel,
          }),
          breadcrumbJsonLd(lang, dict.common.nav.home, [
            { name: dict.common.nav.blogs, path: "/blogs" },
            { name: post.title, path: `/blogs/${post.slug}` },
          ])
        )}
      />
      <Navbar dict={dict.common.nav} language={dict.common.language} forceScrolled />
      <main id="main">
        <article>
          <header className="article-hero">
            <div className="article-hero-inner">
              <Link className="article-back" href="/blogs">
                <span className="article-back-arrow">
                  <Icon name="arrowRight" />
                </span>
                {t.article.back}
              </Link>
              <span className="blog-tag">{post.categoryLabel}</span>
              <h1>{post.title}</h1>
              <p className="article-hero-excerpt">{post.excerpt}</p>
              <div className="article-byline">
                <span className="blog-author">
                  <span className={`blog-avatar avatar-${post.author.accent}`}>
                    {post.author.initials}
                  </span>
                  <span>
                    <span className="blog-author-name">{post.author.name}</span>
                    <span className="article-byline-role">{post.author.role}</span>
                  </span>
                </span>
                <div className="blog-meta">
                  <span>{post.date}</span>
                  <span>{post.readTime}</span>
                </div>
              </div>
            </div>
          </header>

          <div className="article-cover" role="img" aria-label={post.title}>
            <Image src={post.img} alt="" fill sizes="(max-width: 1060px) 100vw, 1000px" priority />
          </div>

          <div className="article-body">
            {post.body.map((block, i) => (
              <Block block={block} key={i} />
            ))}
          </div>
        </article>

        {related.length > 0 && (
          <section className="section-light blog-listing article-related">
            <div className="blog-section-head">
              <h3>{t.latest}</h3>
              <Link className="article-related-all" href="/blogs">
                {t.article.back}
              </Link>
            </div>
            <div className="blog-grid">
              {related.map((p) => (
                <RelatedCard post={p} key={p.slug} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer dict={dict.common.footer} />
    </>
  );
}
