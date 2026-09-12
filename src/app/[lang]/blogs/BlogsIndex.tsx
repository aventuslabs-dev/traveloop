"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "@/i18n/Link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icon } from "@/app/components/Icons";
import type { BlogAuthor, BlogCategory, LocalizedBlogPost } from "@/app/data/blog";
import { fill } from "@/i18n/interpolate";
import type enCommon from "@/i18n/dictionaries/en/common";
import type enBlogs from "@/i18n/dictionaries/en/blogs";

const ALL = "All" as const;

function Author({ author, dark }: { author: BlogAuthor; dark?: boolean }) {
  return (
    <span className="blog-author">
      <span className={`blog-avatar avatar-${author.accent}`}>{author.initials}</span>
      <span className="blog-author-name" style={dark ? { color: "#fff" } : undefined}>
        {author.name}
      </span>
    </span>
  );
}

/** Renders as a link through to the article when the post has body content, otherwise a plain card. */
function Spotlight({
  post,
  className,
  children,
}: {
  post: LocalizedBlogPost;
  className: string;
  children: React.ReactNode;
}) {
  return post.body ? (
    <Link className={`${className} blog-card-link`} href={`/blogs/${post.slug}`}>
      {children}
    </Link>
  ) : (
    <article className={className}>{children}</article>
  );
}

export default function BlogsIndex({
  posts,
  categories,
  categoryLabels,
  dict,
  nav,
  language,
  footer,
}: {
  posts: LocalizedBlogPost[];
  categories: BlogCategory[];
  categoryLabels: Record<BlogCategory, string>;
  dict: typeof enBlogs;
  nav: typeof enCommon.nav;
  language: typeof enCommon.language;
  footer: typeof enCommon.footer;
}) {
  // Filtering is keyed on the English category, which is the stable id; only
  // the button label follows the locale.
  const [activeFilter, setActiveFilter] = useState<typeof ALL | BlogCategory>(ALL);
  const [query, setQuery] = useState("");

  const filters: (typeof ALL | BlogCategory)[] = [ALL, ...categories];

  const primaryPost = posts.find((p) => p.spotlight === "primary");
  const secondaryPosts = posts.filter((p) => p.spotlight === "secondary");
  const isBrowsing = activeFilter !== ALL || query.trim() !== "";

  // The spotlight layout needs a full set (one large + two side cards) to look
  // right. Until the archive is that big, every post goes through the grid.
  const showSpotlight = !isBrowsing && !!primaryPost && secondaryPosts.length >= 2;

  const filteredPosts = useMemo(() => {
    const pool = showSpotlight ? posts.filter((p) => !p.spotlight) : posts;
    const q = query.trim().toLowerCase();
    return pool.filter((p) => {
      const matchesCategory = activeFilter === ALL || p.category === activeFilter;
      const matchesQuery =
        q === "" || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [activeFilter, showSpotlight, query, posts]);

  // Two wide cards read better than two thirds of an empty three-column row.
  const gridClass = filteredPosts.length === 2 ? "blog-grid cols-2" : "blog-grid";

  const renderCard = (p: LocalizedBlogPost) => {
    const inner = (
      <>
        <div className="blog-card-image">
          <Image src={p.img} alt="" fill sizes="(max-width: 862px) 100vw, 33vw" />
        </div>
        <div className="blog-card-body">
          <span className="blog-tag">{p.categoryLabel}</span>
          <h3>{p.title}</h3>
          <p>{p.excerpt}</p>
          <div className="blog-card-footer">
            <Author author={p.author} />
            <div className="blog-meta">
              <span>{p.date}</span>
              <span>{p.readTime}</span>
            </div>
          </div>
        </div>
      </>
    );

    return p.body ? (
      <Link className="blog-card blog-card-link" href={`/blogs/${p.slug}`} key={p.slug}>
        {inner}
      </Link>
    ) : (
      <article className="blog-card" key={p.slug}>
        {inner}
      </article>
    );
  };

  return (
    <>
      <Navbar dict={nav} language={language} forceScrolled />
      <main id="main" className="blogs-main">
        {showSpotlight && primaryPost && (
          <section className="blog-spotlight">
            <Spotlight post={primaryPost} className="blog-spotlight-main">
              <div className="blog-spotlight-image">
                <Image src={primaryPost.img} alt="" fill priority sizes="(max-width: 862px) 100vw, 60vw" />
              </div>
              <div className="blog-spotlight-body">
                <span className="blog-tag on-dark">
                  {fill(dict.featured, { category: primaryPost.categoryLabel })}
                </span>
                <h3>{primaryPost.title}</h3>
                <p>{primaryPost.excerpt}</p>
                <div className="blog-spotlight-footer">
                  <Author author={primaryPost.author} dark />
                  <div className="blog-meta on-dark">
                    <span>{primaryPost.date}</span>
                    <span>{primaryPost.readTime}</span>
                  </div>
                </div>
              </div>
            </Spotlight>

            <div className="blog-spotlight-side">
              {secondaryPosts.map((p) => (
                <Spotlight post={p} className="blog-side-card" key={p.slug}>
                  <div className="blog-side-card-image">
                    <Image src={p.img} alt="" fill sizes="120px" />
                  </div>
                  <div className="blog-side-card-body">
                    <span className="blog-tag">{p.categoryLabel}</span>
                    <h3>{p.title}</h3>
                    <div className="blog-meta">
                      <span>{p.date}</span>
                      <span>{p.readTime}</span>
                    </div>
                  </div>
                </Spotlight>
              ))}
            </div>
          </section>
        )}

        <section className="section-light blog-listing">
          <div className="blog-toolbar">
            <div className="pill-filter">
              {filters.map((f) => (
                <button
                  type="button"
                  key={f}
                  className={`pill-filter-btn${activeFilter === f ? " active" : ""}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f === ALL ? dict.filters.all : categoryLabels[f]}
                </button>
              ))}
            </div>
            <label className="blog-search">
              <Icon name="search" />
              <input
                type="search"
                placeholder={dict.searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>

          <div className="blog-section-head">
            <h3>{isBrowsing ? dict.searchResults : dict.latest}</h3>
            <span>
              {fill(filteredPosts.length === 1 ? dict.countOne : dict.countMany, {
                count: filteredPosts.length,
              })}
            </span>
          </div>

          {filteredPosts.length > 0 ? (
            <div className={gridClass}>{filteredPosts.map(renderCard)}</div>
          ) : (
            <div className="blog-empty">
              <p>{dict.empty}</p>
            </div>
          )}
        </section>
      </main>
      <Footer dict={footer} />
    </>
  );
}
