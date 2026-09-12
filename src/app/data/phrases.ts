import type { Locale } from "@/i18n/config";

/**
 * The sentence fragments that `experiences.ts` and `passes.ts` *generate*
 * rather than store.
 *
 * Quote lines, schedule blurbs and pricing bullets are assembled from live
 * amounts, so they cannot live in a dictionary as finished strings. Each
 * locale supplies the shapes instead, and the numbers are passed in.
 *
 * These are functions, not templates with slots, because the two languages
 * order the parts differently — "50% off" puts the number first, "5折" encodes
 * the *remaining* fraction — and a format string cannot express that.
 */
export type Phrases = {
  /** ["A", "B", "C"] -> "A, B & C" */
  joinList(items: string[]): string;
  /** Separator between schedule groups and between stacked pricing facts. */
  separator: string;
  /** 39000 -> "MYR 390/pax" */
  perPax(price: string): string;
  /**
   * 50 -> "50% off".
   *
   * Chinese states the fraction of the price still payable, not the amount
   * taken off: a 50% discount is 5折 and 25% off is 7.5折. Writing "50% 折扣"
   * reads as *ninety* percent off to a Chinese shopper — the inverse of what
   * is meant — so this is a real correctness issue, not a style preference.
   */
  discount(percent: number): string;
  /** "MYR 390/pax (reg. MYR 520)" */
  priceWithRegular(price: string, regular: string): string;
  /** "Lion Dance from MYR 390/pax" */
  nameFromPrice(name: string, price: string): string;
  /** "50% off Lion Dance, Batik & Indian Culture experiences" */
  experienceDiscounts(discount: string, names: string): string;
  /** "Everything in Silver" */
  everythingIn(tier: string): string;
  /** "Up to MYR 15,000" */
  upTo(amount: string): string;
  /** "Family Pack MYR 400 for 4" */
  packSummary(label: string, price: string, included: number): string;

  /* Quote lines on the booking form. */
  /** "Family Pack (up to 4 participants)" */
  packLine(label: string, included: number): string;
  /** "Group package (up to 4 participants)" */
  groupPackageLine(included: number): string;
  /** "2 additional participants × MYR 100.00" */
  extraParticipantsLine(count: number, price: string): string;
  /** "3 × MYR 390.00 per person" */
  perPersonLine(count: number, price: string): string;
};

/** Trims a trailing ".0" so 7.5 stays 7.5 but 5.0 prints as 5. */
function trimZero(value: number): string {
  return String(Number(value.toFixed(2)));
}

const en: Phrases = {
  joinList: (items) =>
    items.length > 1 ? `${items.slice(0, -1).join(", ")} & ${items.at(-1)}` : items[0],
  separator: " · ",
  perPax: (price) => `${price}/pax`,
  discount: (percent) => `${trimZero(percent)}% off`,
  priceWithRegular: (price, regular) => `${price} (reg. ${regular})`,
  nameFromPrice: (name, price) => `${name} from ${price}`,
  experienceDiscounts: (discount, names) => `${discount} ${names} experiences`,
  everythingIn: (tier) => `Everything in ${tier}`,
  upTo: (amount) => `Up to ${amount}`,
  packSummary: (label, price, included) => `${label} ${price} for ${included}`,
  packLine: (label, included) => `${label} (up to ${included} participants)`,
  groupPackageLine: (included) => `Group package (up to ${included} participants)`,
  extraParticipantsLine: (count, price) =>
    `${count} additional participant${count === 1 ? "" : "s"} × ${price}`,
  perPersonLine: (count, price) => `${count} × ${price} per person`,
};

const cn: Phrases = {
  // Chinese lists use the enumeration comma and finish with 和, with no
  // spaces around either.
  joinList: (items) =>
    items.length > 1 ? `${items.slice(0, -1).join("、")}和${items.at(-1)}` : items[0],
  separator: " · ",
  perPax: (price) => `${price}/人`,
  discount: (percent) => {
    const remaining = (100 - percent) / 10;
    // A 100% discount is "免费", not "0折" — which would be meaningless.
    return remaining <= 0 ? "免费" : `${trimZero(remaining)}折`;
  },
  priceWithRegular: (price, regular) => `${price}（原价 ${regular}）`,
  nameFromPrice: (name, price) => `${name} ${price} 起`,
  experienceDiscounts: (discount, names) => `${names}体验享${discount}`,
  everythingIn: (tier) => `包含${tier}的全部权益`,
  upTo: (amount) => `最高 ${amount}`,
  packSummary: (label, price, included) => `${label} ${price}（${included} 人）`,
  packLine: (label, included) => `${label}（最多 ${included} 人）`,
  groupPackageLine: (included) => `团体配套（最多 ${included} 人）`,
  // Chinese has no plural inflection, so one shape covers every count.
  extraParticipantsLine: (count, price) => `额外 ${count} 人 × ${price}`,
  perPersonLine: (count, price) => `${count} 人 × ${price}/人`,
};

const byLocale: Record<Locale, Phrases> = { en, cn };

export function phrases(lang: Locale = "en"): Phrases {
  return byLocale[lang] ?? en;
}
