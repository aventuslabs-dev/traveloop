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
import { htmlLang, isLocale, locales } from "@/i18n/config";
import { localePage } from "@/i18n/page";
import { fill } from "@/i18n/interpolate";

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
    return { title: common.notFound.title };
  }

  const path = `/blogs/${post.slug}`;

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/${lang}${path}`,
      languages: {
        ...Object.fromEntries(
          locales.map((locale) => [htmlLang[locale], `/${locale}${path}`])
        ),
        "x-default": `/en${path}`,
      },
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      images: [post.img],
    },
  };
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
