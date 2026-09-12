/** /blogs and /blogs/[slug]. */
const blogs = {
  meta: {
    title: "Malaysia Travel Guides & Culture Stories",
    description:
      "Practical guides to travelling in Malaysia — Malay phrases worth knowing, food worth queueing for, and the culture behind the experiences we run.",
    ogDescription:
      "Practical guides to travelling in Malaysia — language, food, and culture, from the Traveloop team.",
  },

  filters: {
    all: "All",
  },

  /** `{category}` is the translated category name. */
  featured: "Featured · {category}",
  searchPlaceholder: "Search articles...",
  searchResults: "Search results",
  latest: "Latest articles",
  /** `{count}` is the number of matching articles. */
  countOne: "{count} article",
  countMany: "{count} articles",
  empty: "No articles match your search yet. Try another keyword or category.",

  article: {
    back: "← All articles",
    /** Shown above the article body. */
    byline: "By {author}",
  },
};

export default blogs;
