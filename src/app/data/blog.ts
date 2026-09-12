import type { Locale } from "@/i18n/config";
export type BlogCategory = "Culture" | "Food" | "Guides" | "Passes";

/** Display order for category filters. Only categories with published posts are shown. */
const categoryOrder: BlogCategory[] = ["Culture", "Food", "Guides", "Passes"];

export type BlogAuthor = {
  name: string;
  role: string;
  initials: string;
  accent: "blue" | "red" | "navy";
};

export const blogAuthors = {
  aina: { name: "Aina Rahman", role: "Culture Writer", initials: "AR", accent: "red" },
  danial: { name: "Danial Hakim", role: "Food Editor", initials: "DH", accent: "blue" },
  team: { name: "Traveloop Team", role: "Editorial", initials: "TL", accent: "navy" },
} satisfies Record<string, BlogAuthor>;

export type BlogPhrase = {
  malay: string;
  english: string;
  note: string;
};

/** A block of article body content. Posts without a `body` stay listing-only. */
export type BlogBlock =
  | { type: "lead"; text: string }
  | { type: "para"; text: string }
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "image"; src: string; alt: string }
  | { type: "list"; items: string[] }
  | { type: "phrases"; items: BlogPhrase[] }
  | { type: "callout"; text: string; cta?: { label: string; href: string } };

export type BlogPost = {
  slug: string;
  category: BlogCategory;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  img: string;
  author: BlogAuthor;
  /** "primary" = the big spotlight card, "secondary" = the smaller spotlight cards beside it */
  spotlight?: "primary" | "secondary";
  /** Full article content. Cards only link through to /blogs/[slug] when this is present. */
  body?: BlogBlock[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "25-malay-phrases-to-learn-before-visiting-malaysia",
    category: "Guides",
    title: "25 Malay Phrases You Should Know When Travelling in Malaysia",
    excerpt:
      "Malaysia is a melting pot of cultures, and Bahasa Melayu is the thread that ties it together. You don't need to be fluent — these 25 everyday phrases are enough to order food, haggle at a market, and find your way around.",
    date: "Jul 30, 2026",
    readTime: "7 min read",
    img: "/blog-malay-phrases.jpg",
    author: blogAuthors.team,
    spotlight: "primary",
    body: [
      {
        type: "lead",
        text: "Malaysia is a melting pot of cultures, and its national language, Malay — or Bahasa Melayu — is spoken by roughly 58% of the population.",
      },
      {
        type: "para",
        text: "English is widely understood in cities, and you'll hear Mandarin, Tamil, and a dozen dialects along the way. But learning a handful of Malay phrases is still one of the fastest ways to connect with locals and navigate your travels with confidence.",
      },
      {
        type: "para",
        text: "You don't need to become fluent. Here are 25 phrases, grouped by the situations you'll actually run into.",
      },

      { type: "heading", text: "5 Malay phrases for greetings" },
      { type: "image", src: "/blog-malay-greetings.jpg", alt: "Locals greeting each other in Malaysia" },
      {
        type: "phrases",
        items: [
          {
            malay: "Selamat pagi. Apa khabar?",
            english: "Good morning. How are you?",
            note: "A friendly opener for the locals you meet on your first day in Malaysia.",
          },
          {
            malay: "Selamat petang",
            english: "Good evening.",
            note: "Used from around 2:00 PM until roughly 7:00 PM.",
          },
          {
            malay: "Terima kasih atas bantuan anda",
            english: "Thank you for your help.",
            note: "For when someone has given you directions or gone out of their way to help.",
          },
          {
            malay: "Sama-sama",
            english: "You're welcome.",
            note: "The standard reply when someone thanks you — it literally means \"same to you\".",
          },
          {
            malay: "Jumpa lagi",
            english: "See you again.",
            note: "A warm goodbye when leaving a shop or restaurant. Add \"selamat jalan\" — have a safe journey — if the other person is the one heading off.",
          },
        ],
      },

      { type: "heading", text: "5 Malay phrases for ordering food" },
      { type: "image", src: "/blog-malay-food.jpg", alt: "A Malaysian hawker stall serving local food" },
      {
        type: "phrases",
        items: [
          {
            malay: "Boleh saya lihat menu?",
            english: "May I see the menu?",
            note: "Add \"menu dalam Bahasa Inggeris\" if you'd like the English version.",
          },
          {
            malay: "Boleh saya minta air kosong?",
            english: "Could I have a glass of plain water?",
            note: "Essential in Malaysia's heat. Ask for \"ais kosong\" if you want it iced.",
          },
          {
            malay: "Saya ingin order … dan …",
            english: "I would like to order … and …",
            note: "A polite way to place your order — for example, \"nasi lemak dan ais kosong\".",
          },
          {
            malay: "Makanan ini sangat sedap!",
            english: "This food is really delicious!",
            note: "Malaysians take real pride in their food, and this one always lands well with the cook.",
          },
          {
            malay: "Boleh saya dapatkan bil?",
            english: "Could I have the bill?",
            note: "For when you're ready to pay at a restaurant or café.",
          },
        ],
      },

      { type: "heading", text: "5 Malay phrases for shopping" },
      { type: "image", src: "/blog-malay-shopping.jpg", alt: "A market stall in Malaysia" },
      {
        type: "phrases",
        items: [
          {
            malay: "Berapa harga barang ini?",
            english: "How much is this item?",
            note: "Your go-to at markets, souvenir shops, and boutiques.",
          },
          {
            malay: "Boleh kurangkan harga sedikit?",
            english: "Could you lower the price a little?",
            note: "Bargaining is expected at street markets — though not in shopping malls.",
          },
          {
            malay: "Ada saiz lain?",
            english: "Do you have another size?",
            note: "Useful when you're shopping for clothing or footwear.",
          },
          {
            malay: "Boleh saya bayar dengan kad?",
            english: "Can I pay by card?",
            note: "Worth confirming before you reach the counter — plenty of smaller stalls are cash-only.",
          },
          {
            malay: "Boleh saya dapatkan resit?",
            english: "May I have the receipt?",
            note: "Handy for tracking your spending or claiming travel expenses later.",
          },
        ],
      },

      { type: "heading", text: "5 Malay phrases to ask for directions" },
      { type: "image", src: "/blog-malay-directions.jpg", alt: "A street scene in Malaysia" },
      {
        type: "phrases",
        items: [
          {
            malay: "Maaf, boleh saya tanya satu soalan?",
            english: "Excuse me, may I ask a question?",
            note: "A polite way to get someone's attention before asking for help.",
          },
          {
            malay: "Di mana tandas yang paling dekat?",
            english: "Where is the nearest restroom?",
            note: "Practical in malls, at attractions, and around public transport hubs.",
          },
          {
            malay: "Di mana stesen bas atau stesen kereta api yang paling dekat?",
            english: "Where is the nearest bus or train station?",
            note: "Malaysia's public transport network takes a little getting used to — this one helps.",
          },
          {
            malay: "Saya sesat. Boleh tunjukkan jalan?",
            english: "I'm lost. Could you show me the way?",
            note: "No shame in it. Malaysians are generally very happy to point you in the right direction.",
          },
          {
            malay: "Berapa lama perjalanan ke sana?",
            english: "How long does it take to get there?",
            note: "Ask a taxi driver or a local how long the trip takes by different modes of transport.",
          },
        ],
      },

      { type: "heading", text: "5 Malay phrases for everyday conversations" },
      { type: "image", src: "/blog-malay-everyday.jpg", alt: "Travellers taking a photo in Malaysia" },
      {
        type: "phrases",
        items: [
          {
            malay: "Saya tidak faham. Boleh cakap perlahan-lahan?",
            english: "I don't understand. Could you speak more slowly?",
            note: "The single most useful phrase on this list when a conversation gets away from you.",
          },
          {
            malay: "Boleh tolong ambilkan gambar saya?",
            english: "Could you please take a photo of me?",
            note: "Swap \"saya\" for \"kami\" if you're asking for a group photo.",
          },
          {
            malay: "Ada Wi-Fi di sini?",
            english: "Is there Wi-Fi here?",
            note: "Most restaurants, cafés, and hotels have it — this is how you ask.",
          },
          {
            malay: "Saya alah kepada…",
            english: "I'm allergic to…",
            note: "Important to know if you have food allergies. Say it clearly to your server or the stall vendor.",
          },
          {
            malay: "Boleh tolong panggil teksi?",
            english: "Can you help me call a taxi?",
            note: "For the times when Grab isn't available or there's no signal.",
          },
        ],
      },

      { type: "heading", text: "A few words go a long way" },
      {
        type: "para",
        text: "You won't be holding full conversations after this, and that's fine. What these 25 phrases do is signal that you've made an effort — and in Malaysia, that usually gets you a warmer welcome, a better price, and the occasional recommendation you'd never have found on your own.",
      },
      {
        type: "callout",
        text: "Planning your trip? The Traveloop Privilege Card bundles exclusive deals at attractions, restaurants, and cultural experiences across Malaysia into one card.",
        cta: { label: "Explore the passes", href: "/passes" },
      },
    ],
  },
  {
    slug: "traveloop-malaysia-all-you-need-to-know",
    category: "Passes",
    title: "Everything You Need to Know About Traveloop Malaysia",
    excerpt:
      "Planning a trip to Malaysia sounds exciting — and it is — but there's almost too much to choose from. Here's who we are, why we started, and what's inside each Privilege Card.",
    date: "Jul 27, 2026",
    readTime: "5 min read",
    img: "/blog-traveloop-intro.jpg",
    author: blogAuthors.team,
    spotlight: "secondary",
    body: [
      {
        type: "lead",
        text: "Planning a trip to Malaysia sounds exciting — and it is — but if it's your first time here, you might realise there's almost too much to choose from.",
      },
      {
        type: "para",
        text: "Malaysia is one of Southeast Asia's most diverse destinations. One day you could be wandering through a bustling city, and the next, relaxing on a tropical island or hiking through lush rainforest and mountain tops.",
      },
      {
        type: "para",
        text: "Wherever you go, you'll also discover a rich blend of cultures, traditions, and some of the best food you'll ever eat. And because of that, planning your itinerary can get a little overwhelming.",
      },
      { type: "para", text: "Here's where Traveloop Malaysia comes in." },

      { type: "heading", text: "So, what is Traveloop Malaysia?" },
      {
        type: "para",
        text: "Over the years, the founders of Traveloop Malaysia noticed the same challenge recurring — international tourists often struggle to find authentic local experiences they can trust, while many Malaysian businesses find it difficult to reach overseas visitors.",
      },
      {
        type: "para",
        text: "There was a clear gap between travellers and local businesses. Inspired by those conversations, Traveloop Malaysia was created to bridge it.",
      },
      {
        type: "para",
        text: "Our goal is simple: to help inbound international visitors discover the very best that Malaysia has to offer.",
      },
      {
        type: "para",
        text: "At the heart of our platform is the Traveloop Privilege Card, which unlocks deals, discounts, and rewards at carefully selected attractions, restaurants, and tourism partners throughout Malaysia.",
      },
      {
        type: "para",
        text: "Whether you're travelling solo, as a couple, with friends, bringing the whole family, or planning your very first trip to Malaysia and aren't sure where to begin — Traveloop Malaysia is here to help.",
      },

      { type: "heading", text: "Here's what we're offering for your trip" },
      {
        type: "para",
        text: "Traveloop Malaysia offers three Privilege Card packages — Silver, Gold, and Platinum — so you can choose the one that best matches your travel style and budget. Each card comes with its own set of exclusive deals, rewards, and local experiences designed to help you make the most of your trip.",
      },

      { type: "subheading", text: "Silver Pass — MYR 39.90 (usual MYR 79.90)" },
      {
        type: "para",
        text: "The Silver Pass is perfect for travellers looking to enjoy great savings while dipping their toes into Malaysia's culture. Here's what's included:",
      },
      {
        type: "list",
        items: [
          "Retail deals worth up to MYR 15,000 — exclusive offers at participating retailers including Upside Down Museum Penang, BMS Organics, Focus Point, and Glass Museum Penang.",
          "Food and beverage deals worth up to MYR 3,000 — discounts at popular cafés and restaurants including Le Petit Four Pâtisserie, Starbucks, Rendez by Meowcho, Hero Tea, Mixue, and Family Mart.",
          "25% off seasonal cultural experiences — the Lion Dance Experience, Batik Painting Experience, and Indian Culture Experience.",
        ],
      },
      {
        type: "para",
        text: "In a Lion Dance session you'll learn the basics of the performance from experienced instructors, try playing Chinese drums, cymbals, and gongs, and step inside a traditional lion costume to perform simple movements. Sessions run Tuesday and Thursday evenings and Sunday afternoons, and children aged 5 and under join free.",
      },

      { type: "subheading", text: "Gold Pass — MYR 69.90 (usual MYR 139.90)" },
      {
        type: "para",
        text: "The Gold Pass includes everything in the Silver Pass, plus travel and personal accident insurance for extra peace of mind throughout your journey in Malaysia.",
      },
      {
        type: "list",
        items: [
          "Everything in the Silver Pass.",
          "Group Personal Accident Insurance underwritten by Tokio Marine Insurans (Malaysia) Berhad.",
          "Up to MYR 50,000 accidental death and disablement cover, plus MYR 500 in medical expenses.",
        ],
      },

      { type: "subheading", text: "Platinum Pass — MYR 89.90 (usual MYR 179.90)" },
      {
        type: "para",
        text: "The Platinum Pass is our most comprehensive package. It includes everything in the Silver and Gold Passes, plus the deepest discount on our Lion Dance Experience and a 90-minute private photography session to help you capture your time in Malaysia.",
      },
      {
        type: "list",
        items: [
          "Everything in the Gold Pass.",
          "75% off the Lion Dance Experience — our deepest discount.",
          "A dedicated professional photographer for 90 minutes.",
          "5 complimentary high-resolution edited digital photos.",
          "1 complimentary 30-second video created from your photoshoot.",
          "Priority support throughout your trip.",
        ],
      },
      {
        type: "para",
        text: "The photography session is shot in George Town's UNESCO heritage zone, for up to 7 people.",
      },

      { type: "heading", text: "Why a Privilege Card instead of separate vouchers?" },
      {
        type: "para",
        text: "Unlike booking multiple vouchers or purchasing separate attraction passes, the Traveloop Privilege Card gives you access to a wide range of exclusive deals and discounts from a single card. What makes us different is the convenience — and the better value we deliver on every journey.",
      },
      {
        type: "callout",
        text: "Ready to start planning? Compare all three Privilege Cards and see exactly what's included in each.",
        cta: { label: "Start planning your trip", href: "/passes" },
      },
    ],
  },
];

export const blogCategories: BlogCategory[] = categoryOrder.filter((c) =>
  blogPosts.some((p) => p.category === c),
);
export const blogFilters: Array<BlogCategory | "All"> = ["All", ...blogCategories];

export function getPostBySlug(slug: string) {
  return blogPosts.find((p) => p.slug === slug);
}

/* ------------------------------------------------------------------ */
/* Localized display                                                   */
/* ------------------------------------------------------------------ */

/** A post with its text swapped for the chosen locale. */
export type LocalizedBlogPost = BlogPost & {
  /** Translated category name for display; `category` stays the English key. */
  categoryLabel: string;
};

function localizeAuthor(author: BlogAuthor, roles: Record<string, string>): BlogAuthor {
  return { ...author, role: roles[author.role] ?? author.role };
}

/**
 * Every post, in one locale.
 *
 * The slug is deliberately not translated: one article has one URL in both
 * languages, so the switcher can move between them and a shared link opens the
 * same piece whichever site it came from.
 */
export async function getBlogPosts(lang: Locale): Promise<LocalizedBlogPost[]> {
  if (lang === "en") {
    return blogPosts.map((post) => ({ ...post, categoryLabel: post.category }));
  }

  const { postCopyCn, categoryLabelsCn, authorRoleLabelsCn } = await import("./cn/blog");

  return blogPosts.map((post) => {
    const copy = postCopyCn[post.slug];
    return {
      ...post,
      title: copy?.title ?? post.title,
      excerpt: copy?.excerpt ?? post.excerpt,
      readTime: copy?.readTime ?? post.readTime,
      body: copy?.body ?? post.body,
      author: localizeAuthor(post.author, authorRoleLabelsCn),
      categoryLabel: categoryLabelsCn[post.category] ?? post.category,
    };
  });
}

export async function getLocalizedPostBySlug(
  slug: string,
  lang: Locale
): Promise<LocalizedBlogPost | undefined> {
  return (await getBlogPosts(lang)).find((post) => post.slug === slug);
}

/** Category filter labels, keyed by the English category. */
export async function getBlogCategoryLabels(
  lang: Locale
): Promise<Record<BlogCategory, string>> {
  if (lang === "en") {
    return Object.fromEntries(categoryOrder.map((c) => [c, c])) as Record<
      BlogCategory,
      string
    >;
  }
  const { categoryLabelsCn } = await import("./cn/blog");
  return categoryLabelsCn;
}
