import type en from "../en/blogs";

/** /blogs 中文文案。 */
const blogs: typeof en = {
  meta: {
    title: "马来西亚旅行攻略与文化故事",
    description:
      "实用的马来西亚旅行攻略 —— 值得学的马来语、值得排队的美食，以及我们各项体验背后的文化。",
    ogDescription: "来自 Traveloop 团队的马来西亚旅行攻略 —— 语言、美食与文化。",
  },

  filters: {
    all: "全部",
  },

  featured: "精选 · {category}",
  searchPlaceholder: "搜索文章…",
  searchResults: "搜索结果",
  latest: "最新文章",
  countOne: "{count} 篇文章",
  countMany: "{count} 篇文章",
  empty: "暂无符合搜索条件的文章。换个关键词或分类试试。",

  article: {
    back: "← 全部文章",
    byline: "作者：{author}",
  },
};

export default blogs;
