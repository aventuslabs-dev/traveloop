import type { Locale } from "@/i18n/config";

export type PartnerCategory = "Dining" | "Shopping" | "Experiences" | "Wellness";

export type Partner = {
  name: string;
  /** Logo in /public/partners. Sourced from traveloop.my/traveloop-malaysia-partners. */
  logo: string;
  category: PartnerCategory;
  location?: string;
  /** Short headline offer — the only line the compact marquee card shows. */
  deal: string;
  /** Conditions attached to the offer, shown on the directory page. */
  terms?: string;
};

export const partnerCategories: PartnerCategory[] = [
  "Dining",
  "Shopping",
  "Experiences",
  "Wellness",
];

export const partners: Partner[] = [
  {
    name: "Sifu Nyonya Cuisine",
    logo: "/partners/sifu-nyonya-cuisine.png",
    category: "Dining",
    location: "Penang",
    deal: "10% off total dine-in",
  },
  {
    name: "Sin Chew Yam Rice",
    logo: "/partners/sin-chew-yam-rice.png",
    category: "Dining",
    location: "Penang",
    deal: "10% off total dine-in",
  },
  {
    name: "Happy Dots",
    logo: "/partners/happy-dots.png",
    category: "Dining",
    location: "Penang",
    deal: "10% off total dine-in",
  },
  {
    name: "Cool Ghost Museum Penang",
    logo: "/partners/cool-ghost-museum.png",
    category: "Experiences",
    location: "Penang",
    deal: "MYR 5 rebate per person",
  },
  {
    name: "Hannan Medispa",
    logo: "/partners/hannan-medispa.png",
    category: "Wellness",
    location: "Kuala Lumpur",
    deal: "Free facial",
  },
  {
    name: "PTC Penang",
    logo: "/partners/ptc-penang.png",
    category: "Experiences",
    location: "Penang",
    deal: "1 hour free court rental",
  },
  {
    name: "Penang History Gallery",
    logo: "/partners/penang-history-gallery.png",
    category: "Experiences",
    location: "Penang",
    deal: "MYR 5 off admission",
    terms: "Discount applies per admission ticket.",
  },
  {
    name: "Kopihut",
    logo: "/partners/kopihut.png",
    category: "Dining",
    location: "Selangor",
    deal: "MYR 5 off",
    terms:
      "Min. MYR 20 dine-in spend. Also MYR 10.90 for Fried Wanton Noodle Soup with min. MYR 20 dine-in spend.",
  },
  {
    name: "Batik Painting Museum Penang",
    logo: "/partners/batik-painting-museum.png",
    category: "Experiences",
    location: "Penang",
    deal: "10% off storewide",
    terms: "Valid on all regular-priced items.",
  },
  {
    name: "YSY Yummy",
    logo: "/partners/ysy-yummy.png",
    category: "Dining",
    location: "Penang",
    deal: "Buy 5 boxes, get 1 free",
  },
  {
    name: "Tokio Marine",
    logo: "/partners/tokio-marine.png",
    category: "Wellness",
    deal: "Insurance coverage",
  },
  {
    name: "Mixue",
    logo: "/partners/mixue.png",
    category: "Dining",
    deal: "MYR 1 off",
    terms: "Register in-store to redeem.",
  },
  {
    name: "Family Mart",
    logo: "/partners/family-mart.png",
    category: "Shopping",
    deal: "Free hot latte",
    terms: "Register in-store to redeem.",
  },
  {
    name: "Upside Down Museum Penang",
    logo: "/partners/upside-down-museum.png",
    category: "Experiences",
    location: "Penang",
    deal: "MYR 4 off admission",
    terms: "Valid for both adult and child tickets.",
  },
  {
    name: "Catfeine Coffee & Joygifts",
    logo: "/partners/catfeine-coffee.png",
    category: "Dining",
    location: "Penang",
    deal: "10% off",
    terms: "With a minimum spend of MYR 30.",
  },
  {
    name: "Two Street",
    logo: "/partners/two-street.png",
    category: "Dining",
    location: "Penang",
    deal: "20% off dine-in",
    terms: "Valid on total dining bill.",
  },
  {
    name: "Hero Tea",
    logo: "/partners/hero-tea.png",
    category: "Dining",
    location: "Penang",
    deal: "10% off dine-in",
    terms: "Valid on total dining bill.",
  },
  {
    name: "The Brick by Just Wine",
    logo: "/partners/the-brick-by-just-wine.png",
    category: "Dining",
    location: "Kuala Lumpur",
    deal: "10% off dine-in",
    terms: "Valid until 31 Dec 2026.",
  },
  {
    name: "Abbey Road Bistro",
    logo: "/partners/abbey-road-bistro.jpg",
    category: "Dining",
    location: "Penang",
    deal: "Free beverage with any main dish",
    terms: "One complimentary non-alcoholic beverage per main dish.",
  },
  {
    name: "Corks Out Bukit Bintang",
    logo: "/partners/corks-out-bukit-bintang.png",
    category: "Dining",
    location: "Kuala Lumpur",
    deal: "10% off dine-in",
    terms: "Valid until 31 Dec 2026.",
  },
  {
    name: "Bean Beans Coffee",
    logo: "/partners/bean-beans-coffee.png",
    category: "Dining",
    location: "Penang",
    deal: "Free soda with any main course",
  },
  {
    name: "Tai Jie",
    logo: "/partners/tai-jie.png",
    category: "Dining",
    location: "Selangor",
    deal: "10% off total bill",
    terms: "Valid until 31 Dec 2026.",
  },
  {
    name: "CU Mart",
    logo: "/partners/cu-mart.png",
    category: "Shopping",
    deal: "MYR 2 off",
    terms: "With a minimum spend of MYR 5.",
  },
  {
    name: "myNEWS Café",
    logo: "/partners/my-news-cafe.png",
    category: "Shopping",
    deal: "MYR 2 off",
    terms: "With a minimum spend of MYR 5.",
  },
  {
    name: "Focus Point",
    logo: "/partners/focus-point.png",
    category: "Shopping",
    location: "Selangor",
    deal: "Extra 5% off branded sunglasses",
    terms: "Show your passport. Valid until 31 Dec 2026.",
  },
  {
    name: "Rendez by Meowchi",
    logo: "/partners/rendez-by-meowchi.png",
    category: "Dining",
    location: "Penang",
    deal: "10% off total bill",
    terms:
      "With a Traveloop Card. Min. spend MYR 50. Valid until 31 Oct 2026.",
  },
  {
    name: "Corks Out Subang",
    logo: "/partners/corks-out-subang.png",
    category: "Dining",
    location: "Selangor",
    deal: "10% off total dining",
    terms: "Valid until 31 Dec 2026.",
  },
  {
    name: "BMS Organics",
    logo: "/partners/bms-organics.png",
    category: "Dining",
    location: "Selangor",
    deal: "Free rojak",
    terms: "Free with MYR 50 minimum dine-in spend. Valid until 31 Dec 2026.",
  },
  {
    name: "Bunglow37",
    logo: "/partners/bunglow37.png",
    category: "Dining",
    location: "Kuala Lumpur",
    deal: "10% off dine-in",
    terms: "Valid until 31 Dec 2026.",
  },
  {
    name: "Chi Hao TTDI",
    logo: "/partners/chi-hao-ttdi.png",
    category: "Dining",
    location: "Kuala Lumpur",
    deal: "10% off dine-in",
    terms: "Valid until 31 Dec 2026.",
  },
];

/**
 * The partner list in one locale.
 *
 * English is the source of truth: the Chinese file supplies phrase-level
 * overrides and anything it does not cover falls through to English, so a
 * newly added partner shows up on both sites immediately rather than
 * disappearing from one of them.
 */
export type LocalizedPartner = Partner & { categoryLabel: string };

export async function getPartners(lang: Locale): Promise<LocalizedPartner[]> {
  if (lang === "en") {
    return partners.map((p) => ({ ...p, categoryLabel: p.category }));
  }

  const { categoriesCn, dealsCn, locationsCn, termsCn } = await import("./cn/partners");

  return partners.map((p) => ({
    ...p,
    categoryLabel: categoriesCn[p.category] ?? p.category,
    location: p.location ? locationsCn[p.location] ?? p.location : undefined,
    deal: dealsCn[p.deal] ?? p.deal,
    terms: p.terms ? termsCn[p.terms] ?? p.terms : undefined,
  }));
}

/** Category filter labels for the directory, in display order. */
export async function getPartnerCategoryLabels(
  lang: Locale
): Promise<Record<PartnerCategory, string>> {
  if (lang === "en") {
    return Object.fromEntries(partnerCategories.map((c) => [c, c])) as Record<
      PartnerCategory,
      string
    >;
  }
  const { categoriesCn } = await import("./cn/partners");
  return categoriesCn;
}
