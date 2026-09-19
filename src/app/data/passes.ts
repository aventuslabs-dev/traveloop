import {
  formatAmount,
  getEntitlement,
  getExperience,
  localizeExperience,
  regularPerPersonCents,
  tierPerPersonCents,
  type Experience,
  type ExperienceKey,
} from "./experiences";

import type { Locale } from "@/i18n/config";
import { phrases } from "./phrases";
import {
  highlightCopyCn,
  perkCopyCn,
  rowCopyCn,
  tierCopyCn,
  valueCopyCn,
} from "./cn/passes";

export type PassKey = "silver" | "gold" | "platinum";

/** Every tier, cheapest first — the order tiers are listed in throughout the site. */
export const tierKeys: PassKey[] = ["silver", "gold", "platinum"];

/** ISO currency code every pass is sold in. Stripe expects it lower-cased. */
export const PASS_CURRENCY = "myr";

export type PassTier = {
  key: PassKey;
  name: string;
  /**
   * Authoritative charge amount in the smallest currency unit (sen).
   * This — never a value posted by the browser — is what Stripe is charged.
   */
  priceCents: number;
  originalPriceCents: number;
  badge?: string;
  tagline: string;
  sub: string;
  /** Short bullet summary shown on pricing cards */
  highlights: string[];
  /** Display strings derived from the amounts above, so the two can't drift apart. */
  price: string;
  originalPrice: string;
};

/** Highlights may be null when a generated bullet doesn't apply; nulls are dropped. */
type PassTierSeed = Omit<PassTier, "price" | "originalPrice" | "highlights"> & {
  highlights: (string | null)[];
};

/** 3990 -> "39.90" */
function formatMinorUnits(amount: number): string {
  return (amount / 100).toFixed(2);
}

/** 39000 -> "MYR 390", keeping the sen only when a price isn't whole ringgit. */
function perPersonLabel(cents: number): string {
  return `MYR ${cents % 100 === 0 ? String(cents / 100) : formatAmount(cents)}`;
}

/**
 * The words on the pricing cards, comparison table and perk list, per locale.
 *
 * Amounts are never in here — every figure on these cards is generated from
 * `priceCents` and `experiences.ts` below, so a translation cannot put a
 * different number in front of a Chinese shopper than an English one.
 */
const tierCopyEn: Record<PassKey, { name: string; tagline: string; sub: string; badge?: string }> = {
  silver: { name: "Silver", tagline: "Great value.", sub: "More to explore." },
  gold: {
    name: "Gold",
    tagline: "Most popular.",
    sub: "More to enjoy.",
    badge: "Most Popular",
  },
  platinum: { name: "Platinum", tagline: "Ultimate experience.", sub: "More to indulge." },
};

const highlightCopyEn = {
  retail: "Retail deals worth up to MYR 15,000",
  fnb: "Food & beverage deals worth up to MYR 3,000",
  insurance: "Travel & personal accident insurance (Tokio Marine)",
  accidentCover: "Up to MYR 50,000 accidental death & disablement",
  photography: "90-minute private photography session",
  prioritySupport: "Priority support",
};

const rowCopyEn = {
  retail: "Retail deals",
  fnb: "Food & beverage deals",
  insurance: "Travel & accident insurance",
  photography: "Private photography session",
};

const valueCopyEn = {
  retailAmount: "Up to MYR 15,000",
  fnbAmount: "Up to MYR 3,000",
};

const perkCopyEn: Record<string, { title: string; description: string; note?: string }> = {
  retail: {
    title: "Retail deals",
    description:
      "Save at partner shops and attractions across Malaysia, including Upside Down Museum Penang, BMS Organics, and Glass Museum Penang.",
    note: "Worth up to MYR 15,000",
  },
  fnb: {
    title: "Food & beverage deals",
    description:
      "Exclusive discounts at Starbucks, Le Petit Four Pâtisserie, Mixue, Family Mart, Hero Tea, Rendez by Meowcho, and more.",
    note: "Worth up to MYR 3,000",
  },
  "lion-dance": {
    title: "Lion Dance Experience",
    description:
      "Learn the basics of lion dance with authentic instruments and a traditional lion head. Book per person, or take the Family Pack for up to 4 with extra participants at MYR 100 each. Sessions run Tuesday & Thursday 8:00–10:00 PM and Sunday 1:00–3:00 PM. Children aged 5 and under join free.",
  },
  batik: {
    title: "Batik Painting Experience",
    description:
      "Discover the history behind Malaysian batik and create your own hand-painted souvenir, including museum admission and light refreshments. Runs Wednesday 10:00 AM–12:00 PM. Children aged 4 and under join free.",
  },
  "indian-culture": {
    title: "Indian Culture Experience",
    description:
      "Try your hand at kolam (rice-flour rangoli) art, a traditional Indian cooking lesson, and a Bharatanatyam dance demonstration. Runs Sunday 3:00–5:00 PM. Children aged 5 and under join free.",
  },
  insurance: {
    title: "Travel & accident insurance",
    description:
      "Group Personal Accident Insurance underwritten by Tokio Marine Insurans (Malaysia) Berhad, covering registered participants aged 30 days to 75 years while in Malaysia — including amateur sports, scuba diving up to 50m, and mountaineering.",
    note: "Up to MYR 50,000 accidental death & disablement · MYR 500 medical expenses",
  },
  photography: {
    title: "Private photography session",
    description:
      "A 90-minute private photoshoot with a professional photographer through George Town's UNESCO heritage zone, with 5 edited high-resolution photos and a 30-second video included. Up to 7 people in the shoot. Runs Saturday 8:30–10:00 AM and 10:00–11:30 AM.",
    note: "Free · 5 edited photos + a 30-second video · Book at least 3 days ahead",
  },
};

/** The copy set for a locale, with English standing in for anything untranslated. */
function copy(lang: Locale) {
  const cn = lang === "cn";
  return {
    tier: (key: PassKey) => ({ ...tierCopyEn[key], ...(cn ? tierCopyCn[key] : {}) }),
    highlight: cn ? { ...highlightCopyEn, ...highlightCopyCn } : highlightCopyEn,
    row: cn ? { ...rowCopyEn, ...rowCopyCn } : rowCopyEn,
    value: cn ? { ...valueCopyEn, ...valueCopyCn } : valueCopyEn,
    perk: (id: string) => ({ ...perkCopyEn[id], ...(cn ? perkCopyCn[id] ?? {} : {}) }),
  };
}

/** The experiences a pass is sold on, in the order they're listed. */
const comparedExperienceKeys: ExperienceKey[] = ["lion-dance", "batik", "indian-culture"];

const comparedExperiences: Experience[] = comparedExperienceKeys.flatMap((key) => {
  const experience = getExperience(key);
  return experience ? [experience] : [];
});

/** "Lion Dance Experience" -> "Lion Dance", "舞狮体验" -> "舞狮" */
function shortExperienceName(experience: Experience, lang: Locale): string {
  const name = localizeExperience(experience, lang).name;
  return lang === "cn" ? name.replace(/体验$/, "") : name.replace(/ Experience$/, "");
}

/**
 * The experience-discount bullet on a pricing card, e.g.
 * "50% off Lion Dance, Batik Painting & Indian Culture experiences".
 *
 * The rate most experiences share becomes the headline and anything discounted
 * differently is named with its own price instead — folding an odd rate into
 * the one percentage would put a wrong number on the card.
 */
function experienceHighlight(tier: PassKey, lang: Locale): string | null {
  const p = phrases(lang);
  const entries = comparedExperiences
    .map((experience) => ({ experience, entitlement: getEntitlement(tier, experience) }))
    .filter(({ entitlement }) => entitlement.entitled);

  if (entries.length === 0) return null;

  const counts = new Map<number, number>();
  for (const { entitlement } of entries) {
    counts.set(entitlement.discountPercent, (counts.get(entitlement.discountPercent) ?? 0) + 1);
  }
  const [headline] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  const shared = entries.filter(({ entitlement }) => entitlement.discountPercent === headline);
  const outliers = entries.filter(({ entitlement }) => entitlement.discountPercent !== headline);

  const names = p.joinList(
    shared.map(({ experience }) => shortExperienceName(experience, lang))
  );
  const parts = [p.experienceDiscounts(p.discount(headline), names)];

  for (const { experience } of outliers) {
    const cents = tierPerPersonCents(experience, tier);
    if (cents === null) continue;
    parts.push(
      p.nameFromPrice(shortExperienceName(experience, lang), p.perPax(perPersonLabel(cents)))
    );
  }

  return parts.join(p.separator);
}

function passTierSeeds(lang: Locale): PassTierSeed[] {
  const c = copy(lang);
  const p = phrases(lang);

  return [
    {
      key: "silver",
      ...c.tier("silver"),
      priceCents: 3990,
      originalPriceCents: 7990,
      highlights: [c.highlight.retail, c.highlight.fnb, experienceHighlight("silver", lang)],
    },
    {
      key: "gold",
      ...c.tier("gold"),
      priceCents: 6990,
      originalPriceCents: 13990,
      highlights: [
        p.everythingIn(c.tier("silver").name),
        experienceHighlight("gold", lang),
        c.highlight.insurance,
        c.highlight.accidentCover,
      ],
    },
    {
      key: "platinum",
      ...c.tier("platinum"),
      priceCents: 8990,
      originalPriceCents: 17990,
      highlights: [
        p.everythingIn(c.tier("gold").name),
        experienceHighlight("platinum", lang),
        c.highlight.photography,
        c.highlight.prioritySupport,
      ],
    },
  ];
}

/** Every tier, priced and worded for one locale. */
export function getPassTiers(lang: Locale): PassTier[] {
  return passTierSeeds(lang).map((tier) => ({
    ...tier,
    highlights: tier.highlights.filter((h): h is string => h !== null),
    price: formatMinorUnits(tier.priceCents),
    originalPrice: formatMinorUnits(tier.originalPriceCents),
  }));
}

/**
 * The English tiers.
 *
 * Kept as a plain export because this is what the checkout route and every
 * server-side price check read — those must not depend on what language a
 * browser happened to be showing.
 */
export const passTiers: PassTier[] = getPassTiers("en");

/** Narrows an untrusted value (request body, query string) to a real tier key. */
export function isPassKey(value: unknown): value is PassKey {
  return passTiers.some((tier) => tier.key === value);
}

/** Looks up a tier by key, or returns undefined for anything unrecognised. */
export function getPassTier(key: unknown): PassTier | undefined {
  return isPassKey(key) ? passTiers.find((tier) => tier.key === key) : undefined;
}

/**
 * What to call a tier in the reader's language — "Gold" or "金卡".
 *
 * Orders and bookings store `passName` as it read in English when the purchase
 * was made, because that is what our records, the invoice and the insurer's
 * file say. Anything a customer *reads* goes through here instead, keyed off
 * `passKey`, so a Chinese buyer isn't shown an English tier name on a page
 * that is otherwise entirely in Chinese.
 *
 * Falls back to the stored name for a key that has since left the catalogue.
 */
export function localizedPassName(key: unknown, lang: Locale, fallback: string): string {
  if (!isPassKey(key)) return fallback;
  return getPassTiers(lang).find((tier) => tier.key === key)?.name ?? fallback;
}

/** A priced cell: the regular rate struck through, what this tier pays, and the saving. */
export type PassComparisonPrice = {
  regular: string;
  price: string;
  discount: string;
};

export type PassComparisonValue = string | boolean | PassComparisonPrice;

export function isComparisonPrice(value: PassComparisonValue): value is PassComparisonPrice {
  return typeof value === "object";
}

export type PassComparisonRow = {
  label: string;
  values: Record<PassKey, PassComparisonValue>;
};

/**
 * One comparison row per bookable experience, priced straight from
 * `experiences.ts` rather than transcribed — the table showed stale discounts
 * for months because those two were maintained by hand.
 */
function experienceRow(experience: Experience, lang: Locale): PassComparisonRow {
  const regular = regularPerPersonCents(experience);
  const p = phrases(lang);

  const values = tierKeys.reduce((acc, tier) => {
    const entitlement = getEntitlement(tier, experience);
    const cents = tierPerPersonCents(experience, tier);

    acc[tier] =
      !entitlement.entitled || cents === null || regular === null
        ? entitlement.entitled
        : {
            regular: p.perPax(perPersonLabel(regular)),
            price: p.perPax(perPersonLabel(cents)),
            discount: p.discount(entitlement.discountPercent),
          };
    return acc;
  }, {} as Record<PassKey, PassComparisonValue>);

  return { label: localizeExperience(experience, lang).name, values };
}

/** The tier comparison table, worded for one locale. */
export function getPassComparison(lang: Locale): PassComparisonRow[] {
  const c = copy(lang);
  const everyTier = (value: PassComparisonValue) => ({
    silver: value,
    gold: value,
    platinum: value,
  });

  return [
    { label: c.row.retail, values: everyTier(c.value.retailAmount) },
    { label: c.row.fnb, values: everyTier(c.value.fnbAmount) },
    ...comparedExperiences.map((experience) => experienceRow(experience, lang)),
    {
      label: c.row.insurance,
      values: { silver: false, gold: true, platinum: true },
    },
    {
      label: c.row.photography,
      values: { silver: false, gold: false, platinum: true },
    },
  ];
}

export const passComparison: PassComparisonRow[] = getPassComparison("en");

export type PassPerkCategory = {
  icon: string;
  img: string;
  title: string;
  description: string;
  /** Per-tier detail text; a tier is omitted if the perk isn't part of that tier */
  tierNotes: Partial<Record<PassKey, string>>;
};

/**
 * A perk backed by a bookable experience states no prices of its own — they're
 * generated from `experiences.ts` so a rate change lands here automatically.
 */
type PassPerkCategorySeed = Omit<PassPerkCategory, "tierNotes"> &
  ({ tierNotes: Partial<Record<PassKey, string>> } | { experienceKey: ExperienceKey });

/** "25% off · MYR 390/pax (reg. MYR 520)" */
function experienceTierNotes(
  experience: Experience,
  lang: Locale
): Partial<Record<PassKey, string>> {
  const p = phrases(lang);
  const localized = localizeExperience(experience, lang);
  const regular = regularPerPersonCents(experience);
  // A group pack is a flat rate every entitled tier pays, so it reads the same
  // on all of them — but it only belongs on tiers that can book at all.
  const pack = localized.pricing.mode === "per-person" ? localized.pricing.groupPack : undefined;
  const notes: Partial<Record<PassKey, string>> = {};

  for (const tier of tierKeys) {
    const entitlement = getEntitlement(tier, experience);
    if (!entitlement.entitled) continue;

    const cents = tierPerPersonCents(experience, tier);
    const parts = [p.discount(entitlement.discountPercent)];

    if (cents !== null && regular !== null) {
      parts.push(
        p.priceWithRegular(p.perPax(perPersonLabel(cents)), perPersonLabel(regular))
      );
    }

    if (pack) {
      parts.push(
        p.packSummary(
          pack.label,
          perPersonLabel(pack.baseGroupCents),
          pack.includedParticipants
        )
      );
    }

    notes[tier] = parts.join(p.separator);
  }

  return notes;
}

/**
 * The perk list, worded for one locale.
 *
 * Each entry names a copy id; the title, description and any fixed tier note
 * come from the copy tables above, while a perk backed by a bookable
 * experience has its tier notes generated from live prices instead.
 */
function passPerkCategorySeeds(lang: Locale): PassPerkCategorySeed[] {
  const c = copy(lang);

  /** A perk whose per-tier note is the same fixed line on every listed tier. */
  const fixed = (
    id: string,
    icon: string,
    img: string,
    tiers: PassKey[]
  ): PassPerkCategorySeed => {
    const perk = c.perk(id);
    return {
      icon,
      img,
      title: perk.title,
      description: perk.description,
      tierNotes: Object.fromEntries(tiers.map((tier) => [tier, perk.note ?? ""])),
    };
  };

  const fromExperience = (
    id: ExperienceKey,
    icon: string,
    img: string
  ): PassPerkCategorySeed => {
    const perk = c.perk(id);
    return { icon, img, title: perk.title, description: perk.description, experienceKey: id };
  };

  return [
    fixed("retail", "bag", "/privileges.png", tierKeys),
    fixed("fnb", "fork", "/charkueyteow.jpg", tierKeys),
    fromExperience("lion-dance", "ticket", "/lion-dance.webp"),
    fromExperience("batik", "landmark", "/batik.jpg"),
    fromExperience("indian-culture", "users", "/food-malaysia.png"),
    fixed("insurance", "shield", "/tokio.png", ["gold", "platinum"]),
    fixed(
      "photography",
      "camera",
      "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1000&q=85",
      ["platinum"]
    ),
  ];
}

export function getPassPerkCategories(lang: Locale): PassPerkCategory[] {
  return passPerkCategorySeeds(lang).flatMap((seed) => {
    if ("tierNotes" in seed) return [seed];

    const { experienceKey, ...rest } = seed;
    const experience = getExperience(experienceKey);
    return experience
      ? [{ ...rest, tierNotes: experienceTierNotes(experience, lang) }]
      : [];
  });
}

export const passPerkCategories: PassPerkCategory[] = getPassPerkCategories("en");
