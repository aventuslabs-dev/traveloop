import type { PassKey } from "./passes";

/**
 * The bookable cultural experiences, the weekly sessions they run, and what
 * each pass tier is entitled to.
 *
 * Prices here are the *regular* (undiscounted) amounts in sen. The tier
 * discount in `discountByTier` is applied on top, so the pass-holder price and
 * the "reg." price shown next to it can never drift apart. A tier missing from
 * `discountByTier` is not entitled to the experience at all — that map is the
 * single source of truth for access, and the server re-checks it before any
 * booking is written.
 *
 * Bookings are payment-on-the-day: nothing is charged online, so every amount
 * produced here is a quote the customer settles at the venue.
 */

import type { Locale } from "@/i18n/config";
import { htmlLang } from "@/i18n/config";
import { phrases } from "./phrases";
import { experienceCopyCn, type ExperienceCopy } from "./cn/experiences";

export type ExperienceKey = "lion-dance" | "batik" | "indian-culture" | "photography";

export const EXPERIENCE_CURRENCY = "MYR";

/** Everything is scheduled in Malaysian local time; the country has no DST. */
export const EXPERIENCE_TIME_ZONE = "Asia/Kuala_Lumpur";

/** A customer must book at least this many days before the session. */
export const BOOKING_LEAD_DAYS = 3;

/** How far ahead the calendar lets a customer look. */
export const BOOKING_WINDOW_DAYS = 60;

/** A booking can be cancelled from the portal until this many hours before it starts. */
export const CANCELLATION_CUTOFF_HOURS = 48;

/** 0 = Sunday … 6 = Saturday, matching Date#getUTCDay. */
export type WeeklySession = {
  weekday: number;
  startMinutes: number;
  endMinutes: number;
};

export type ExperiencePackage = {
  key: string;
  label: string;
  priceCents: number;
  note?: string;
};

/**
 * A flat-rate pack offered alongside per-person pricing: one price covering up
 * to `includedParticipants`, plus a flat rate for every person beyond that.
 *
 * A pack price is already the pass-holder rate, so no tier discount is applied
 * on top and every entitled tier pays the same for it. The customer chooses
 * between the pack and the per-person rate on the booking form.
 *
 * `minParticipants` is the headcount the pack unlocks at. It is tracked apart
 * from `includedParticipants` because "who may buy this" and "how many it
 * covers" are different questions — and because without it a party of two
 * could take a four-person price.
 */
export type ExperienceGroupPack = {
  key: string;
  label: string;
  baseGroupCents: number;
  minParticipants: number;
  includedParticipants: number;
  extraPersonCents: number;
  note?: string;
};

/** Whether this booking is big enough to take the pack at all. */
export function packAvailable(pack: ExperienceGroupPack, participants: number): boolean {
  return participants >= pack.minParticipants;
}

/** The `packageKey` standing for "no pack taken — priced per person". */
export const PER_PERSON_PRICE_KEY = "per-person";

export type ExperiencePricing =
  /** One regular price per participant, optionally with a flat-rate pack alongside. */
  | { mode: "per-person"; basePerPersonCents: number; groupPack?: ExperienceGroupPack }
  /**
   * A group package covering up to `includedParticipants` people, with each
   * person beyond that charged `extraPersonCents`.
   *
   * Only the package carries the tier discount. `extraPersonCents` is a flat
   * rate every tier pays — a Silver holder and a Platinum holder are charged
   * the same for a fifth participant.
   */
  | {
      mode: "group";
      baseGroupCents: number;
      minParticipants: number;
      includedParticipants: number;
      extraPersonCents: number;
    }
  /**
   * Fixed packages the customer chooses between. These are already the
   * pass-holder price, so no tier discount is applied on top.
   */
  | { mode: "packages"; options: ExperiencePackage[] }
  /**
   * Covered by the pass itself: nothing is payable for the session, and
   * anything beyond what it includes is sold at the session rather than booked
   * here. `label` is the single line the quote shows.
   */
  | { mode: "included"; label: string };

export type ExperienceLocationOption = {
  value: string;
  label: string;
  comingSoon?: boolean;
};

export type Experience = {
  key: ExperienceKey;
  name: string;
  /** Matches an `Icon` name in app/components/Icons.tsx. */
  icon: string;
  image: string;
  tagline: string;
  description: string;
  /** Bullets shown on the booking page — what the session actually includes. */
  includes: string[];
  durationLabel: string;
  /**
   * Fixed venue, or null when the customer picks from `locationOptions` /
   * the venue is confirmed after booking.
   */
  venue: string | null;
  venueNote?: string;
  locationOptions?: ExperienceLocationOption[];
  /** The fixed weekly sessions this experience runs. */
  sessions: WeeklySession[];
  pricing: ExperiencePricing;
  /** Percentage off the regular price, per tier. Absent tier = no access. */
  discountByTier: Partial<Record<PassKey, number>>;
  participants: { min: number; max: number; label: string };
  /** Children below this age join free and aren't counted as paying participants. */
  freeChildAgeUnder?: number;
  /** Shown on the confirmation step — what the customer should know before turning up. */
  knowBeforeYouGo: string[];
};

const HOUR = 60;

export const experiences: Experience[] = [
  {
    key: "lion-dance",
    name: "Lion Dance Experience",
    icon: "ticket",
    image: "/lion-dance.webp",
    tagline: "Learn the drums, the steps and the lion head.",
    description:
      "A hands-on session with a Penang lion dance troupe: authentic instruments, a traditional lion head, and the basics of the routine taught by performers who compete with it.",
    includes: [
      "Guided introduction to lion dance history and symbolism",
      "Hands-on time with the drum, gong and cymbals",
      "Try the lion head with a partner, under instruction",
      "Photos with the troupe at the end of the session",
    ],
    durationLabel: "2 hours",
    venue: "Penang Island",
    venueNote: "The exact address on Penang Island is confirmed by our team after booking.",
    sessions: [
      { weekday: 2, startMinutes: 20 * HOUR, endMinutes: 22 * HOUR },
      { weekday: 4, startMinutes: 20 * HOUR, endMinutes: 22 * HOUR },
      { weekday: 0, startMinutes: 13 * HOUR, endMinutes: 15 * HOUR },
    ],
    pricing: {
      mode: "per-person",
      basePerPersonCents: 80_000,
      groupPack: {
        key: "family-pack",
        label: "Family Pack",
        baseGroupCents: 40_000,
        minParticipants: 4,
        includedParticipants: 4,
        extraPersonCents: 10_000,
        note: "One price for up to 4 — additional participants MYR 100 each",
      },
    },
    discountByTier: { silver: 25, gold: 50, platinum: 75 },
    participants: { min: 1, max: 20, label: "Participants" },
    freeChildAgeUnder: 6,
    knowBeforeYouGo: [
      "Wear comfortable clothing and closed shoes you can move in.",
      "Arrive 15 minutes early — the troupe starts on time.",
      "Children aged 5 and under join free and don't need to be counted below.",
    ],
  },
  {
    key: "batik",
    name: "Batik Painting Experience",
    icon: "landmark",
    image: "/batik.jpg",
    tagline: "Paint a souvenir you actually made yourself.",
    description:
      "Discover the history behind Malaysian batik, then hand-paint your own piece to take home. Museum admission and light refreshments are included.",
    includes: [
      "Museum admission and a guided look at the batik collection",
      "All materials — fabric, wax resist, dyes and brushes",
      "Your finished piece to take home",
      "Light refreshments during the session",
    ],
    durationLabel: "2 hours",
    venue: "Muzium & Galeri Tuanku Fauziah",
    sessions: [{ weekday: 3, startMinutes: 10 * HOUR, endMinutes: 12 * HOUR }],
    pricing: { mode: "per-person", basePerPersonCents: 52_000 },
    discountByTier: { silver: 25, gold: 50, platinum: 75 },
    participants: { min: 1, max: 20, label: "Participants" },
    freeChildAgeUnder: 5,
    knowBeforeYouGo: [
      "Dyes stain — wear something you don't mind marking, or bring an apron.",
      "Your piece needs about 30 minutes to dry before you can take it away.",
      "Children aged 4 and under join free and don't need to be counted below.",
    ],
  },
  {
    key: "indian-culture",
    name: "Indian Culture Experience",
    icon: "users",
    image: "/food-malaysia.png",
    tagline: "Kolam art, a cooking lesson and Bharatanatyam.",
    description:
      "An afternoon at Penang's Mariamman Temple: try your hand at kolam rice-flour art, take a traditional Indian cooking lesson, and watch a Bharatanatyam dance demonstration.",
    includes: [
      "Kolam (rice-flour rangoli) workshop",
      "Traditional Indian cooking lesson",
      "Live Bharatanatyam dance demonstration",
      "Guided introduction to the temple and its history",
    ],
    durationLabel: "2 hours",
    venue: "Mariamman Temple",
    sessions: [{ weekday: 0, startMinutes: 15 * HOUR, endMinutes: 17 * HOUR }],
    pricing: { mode: "per-person", basePerPersonCents: 52_000 },
    discountByTier: { silver: 25, gold: 50, platinum: 75 },
    participants: { min: 1, max: 20, label: "Participants" },
    freeChildAgeUnder: 6,
    knowBeforeYouGo: [
      "The temple is a place of worship — shoulders and knees should be covered.",
      "Shoes are removed at the entrance.",
      "Children aged 5 and under join free and don't need to be counted below.",
    ],
  },
  {
    key: "photography",
    name: "Private Photography Session",
    icon: "camera",
    image:
      "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1000&q=85",
    tagline: "90 free minutes with a professional photographer.",
    description:
      "A private shoot through George Town's UNESCO heritage streets with a professional photographer who knows where the light lands. Included with your Platinum Pass — you keep 5 edited photos and a 30-second video, with more available from the photographer if you want them.",
    includes: [
      "90-minute private session with a professional photographer",
      "Location scouting and posing direction throughout",
      "5 professionally edited, high-resolution digital photos",
      "A 30-second highlight video of the session",
    ],
    durationLabel: "90 minutes",
    venue: "George Town UNESCO Heritage Zone",
    venueNote:
      "Your photographer meets you in the George Town UNESCO zone — the exact meeting point is confirmed after booking.",
    sessions: [
      { weekday: 6, startMinutes: 8 * HOUR + 30, endMinutes: 10 * HOUR },
      { weekday: 6, startMinutes: 10 * HOUR, endMinutes: 11 * HOUR + 30 },
    ],
    pricing: { mode: "included", label: "5 edited photos + 30-second video" },
    discountByTier: { platinum: 0 },
    participants: { min: 1, max: 7, label: "People in the shoot" },
    knowBeforeYouGo: [
      "Sessions run Saturday mornings only — the light is best before midday.",
      "Your 5 edited photos and 30-second video are delivered by download link within 7 working days.",
      "Shoots start from Armenian Street unless we agree otherwise.",
      "Additional edited photos from your shoot can be bought from the photographer on the day.",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Localized display                                                   */
/* ------------------------------------------------------------------ */

/**
 * The Chinese copy for an experience, or undefined for English and for
 * anything not translated yet.
 *
 * Imported statically rather than lazily because `quoteBooking` is synchronous
 * and runs in the browser as the customer changes the headcount. The file is a
 * few kilobytes of text with no logic in it.
 */
function localizedCopy(key: ExperienceKey, lang: Locale): ExperienceCopy | undefined {
  return lang === "cn" ? experienceCopyCn[key] : undefined;
}

/** The pack's own name, translated when there is a translation for it. */
function packLabel(experience: Experience, fallback: string, lang: Locale): string {
  return localizedCopy(experience.key, lang)?.packLabel ?? fallback;
}

/**
 * An experience with its display text swapped for the chosen locale.
 *
 * Everything the booking logic reads — key, prices, sessions, discounts,
 * participant limits — is passed through untouched, so a localized experience
 * quotes and validates exactly like the English one.
 */
export function localizeExperience(experience: Experience, lang: Locale): Experience {
  const copy = localizedCopy(experience.key, lang);
  if (!copy) return experience;

  const pricing: ExperiencePricing =
    experience.pricing.mode === "per-person" && experience.pricing.groupPack
      ? {
          ...experience.pricing,
          groupPack: {
            ...experience.pricing.groupPack,
            label: copy.packLabel ?? experience.pricing.groupPack.label,
            note: copy.packNote ?? experience.pricing.groupPack.note,
          },
        }
      : experience.pricing.mode === "included"
        ? { ...experience.pricing, label: copy.includedLabel ?? experience.pricing.label }
        : experience.pricing;

  return {
    ...experience,
    name: copy.name ?? experience.name,
    tagline: copy.tagline ?? experience.tagline,
    description: copy.description ?? experience.description,
    includes: copy.includes ?? experience.includes,
    durationLabel: copy.durationLabel ?? experience.durationLabel,
    venue: copy.venue ?? experience.venue,
    venueNote: copy.venueNote ?? experience.venueNote,
    knowBeforeYouGo: copy.knowBeforeYouGo ?? experience.knowBeforeYouGo,
    participants: {
      ...experience.participants,
      label: copy.participantsLabel ?? experience.participants.label,
    },
    pricing,
  };
}

/** Every experience, in display order, in one locale. */
export function getExperiences(lang: Locale): Experience[] {
  return experiences.map((experience) => localizeExperience(experience, lang));
}

/** Looks up a tier by key and localizes it, or undefined if the key is junk. */
export function getLocalizedExperience(
  key: unknown,
  lang: Locale
): Experience | undefined {
  const experience = getExperience(key);
  return experience ? localizeExperience(experience, lang) : undefined;
}

export function isExperienceKey(value: unknown): value is ExperienceKey {
  return experiences.some((experience) => experience.key === value);
}

export function getExperience(key: unknown): Experience | undefined {
  return isExperienceKey(key) ? experiences.find((e) => e.key === key) : undefined;
}

/* ------------------------------------------------------------------ */
/* Entitlement                                                         */
/* ------------------------------------------------------------------ */

export type Entitlement =
  | { entitled: true; discountPercent: number }
  | { entitled: false; discountPercent: 0; upgradeTo: PassKey[] };

/**
 * What a given pass tier unlocks for a given experience.
 *
 * This is the access check the whole feature hangs off: the browse page uses
 * it to lock cards, the booking page to price, and the server action to refuse
 * a booking whose pass doesn't cover it.
 */
export function getEntitlement(passKey: string, experience: Experience): Entitlement {
  const discountPercent = experience.discountByTier[passKey as PassKey];

  if (discountPercent === undefined) {
    return {
      entitled: false,
      discountPercent: 0,
      upgradeTo: Object.keys(experience.discountByTier) as PassKey[],
    };
  }

  return { entitled: true, discountPercent };
}

/** The experiences a pass tier can book, in catalogue order. */
export function experiencesForPass(passKey: string): Experience[] {
  return experiences.filter((e) => getEntitlement(passKey, e).entitled);
}

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

export type QuoteLine = { label: string; amountCents: number };

export type Quote = {
  lines: QuoteLine[];
  /** What the customer pays at the venue. */
  totalCents: number;
  /** What the same booking would cost without a pass. */
  regularTotalCents: number;
  savingsCents: number;
  discountPercent: number;
};

/** 39000 -> "390.00" */
export function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** 39000 -> "MYR 390.00" */
export function formatPrice(cents: number): string {
  return `${EXPERIENCE_CURRENCY} ${formatAmount(cents)}`;
}

/** Rounds to whole sen so a percentage discount can't produce fractional money. */
function applyDiscount(cents: number, discountPercent: number): number {
  return Math.round(cents * (1 - discountPercent / 100));
}

/** 25 -> "25", 83.75 -> "83.75" — no trailing zeros on whole percentages. */
export function formatDiscountPercent(discountPercent: number): string {
  return String(discountPercent);
}

/**
 * What one participant pays at a given tier, or null when no single per-person
 * figure exists — the tier isn't entitled, or the experience is package-priced.
 *
 * This is what the marketing copy on the passes page is built from, so the
 * prices a shopper compares are the same ones `quoteBooking` will charge them.
 */
export function tierPerPersonCents(experience: Experience, tier: PassKey): number | null {
  const entitlement = getEntitlement(tier, experience);
  if (!entitlement.entitled || experience.pricing.mode !== "per-person") return null;
  return applyDiscount(experience.pricing.basePerPersonCents, entitlement.discountPercent);
}

/** The undiscounted per-person price, or null for package-priced experiences. */
export function regularPerPersonCents(experience: Experience): number | null {
  return experience.pricing.mode === "per-person"
    ? experience.pricing.basePerPersonCents
    : null;
}

export type QuoteInput = {
  participants: number;
  /**
   * The chosen package, for `mode: "packages"`, or the chosen group pack, for a
   * per-person experience that offers one. Anything else prices per person.
   */
  packageKey?: string | null;
};

/**
 * Prices a booking. The browser runs this to preview a total and the server
 * runs it again on submit — the stored amount always comes from the server
 * copy, so a tampered form can't book a MYR 390 workshop for nothing.
 */
export function quoteBooking(
  experience: Experience,
  discountPercent: number,
  input: QuoteInput,
  /**
   * Language for the *labels* only. Defaults to English so every existing
   * server-side caller keeps its exact behaviour: the amounts this returns do
   * not depend on it, and must not.
   */
  lang: Locale = "en"
): Quote {
  const p = phrases(lang);
  const lines: QuoteLine[] = [];
  let regularTotalCents = 0;

  switch (experience.pricing.mode) {
    case "per-person": {
      const { basePerPersonCents, groupPack } = experience.pricing;

      // Either way the comparison price is the undiscounted per-person rate for
      // everyone coming — that's what the booking would cost without a pass.
      regularTotalCents = basePerPersonCents * input.participants;

      if (groupPack && input.packageKey === groupPack.key && packAvailable(groupPack, input.participants)) {
        const extras = Math.max(0, input.participants - groupPack.includedParticipants);

        lines.push({
          label: p.packLine(packLabel(experience, groupPack.label, lang), groupPack.includedParticipants),
          amountCents: groupPack.baseGroupCents,
        });

        if (extras > 0) {
          lines.push({
            label: p.extraParticipantsLine(extras, formatPrice(groupPack.extraPersonCents)),
            amountCents: groupPack.extraPersonCents * extras,
          });
        }
        break;
      }

      const perPersonCents = applyDiscount(basePerPersonCents, discountPercent);
      lines.push({
        label: p.perPersonLine(input.participants, formatPrice(perPersonCents)),
        amountCents: perPersonCents * input.participants,
      });
      break;
    }

    case "group": {
      const { baseGroupCents, includedParticipants, extraPersonCents } = experience.pricing;
      const extras = Math.max(0, input.participants - includedParticipants);

      // Extras are flat-rated, so they add the same amount to the pass-holder
      // total and to the regular-price comparison — the saving shown is
      // entirely the discount on the package itself.
      regularTotalCents = baseGroupCents + extraPersonCents * extras;

      lines.push({
        label: p.groupPackageLine(includedParticipants),
        amountCents: applyDiscount(baseGroupCents, discountPercent),
      });

      if (extras > 0) {
        lines.push({
          label: p.extraParticipantsLine(extras, formatPrice(extraPersonCents)),
          amountCents: extraPersonCents * extras,
        });
      }
      break;
    }

    case "packages": {
      const option =
        experience.pricing.options.find((o) => o.key === input.packageKey) ??
        experience.pricing.options[0];

      // Package prices are already the pass-holder rate, so there is nothing
      // to discount and no "regular" price to strike through.
      regularTotalCents = option.priceCents;
      lines.push({ label: option.label, amountCents: option.priceCents });
      break;
    }

    case "included": {
      // Nothing is payable for the session itself, so there is no regular price
      // to strike through and no saving to claim against one.
      regularTotalCents = 0;
      lines.push({
        label: localizedCopy(experience.key, lang)?.includedLabel ?? experience.pricing.label,
        amountCents: 0,
      });
      break;
    }
  }

  const totalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);

  return {
    lines,
    totalCents,
    regularTotalCents,
    savingsCents: Math.max(0, regularTotalCents - totalCents),
    discountPercent,
  };
}

/**
 * Prices are deliberately absent from the browse pages: an experience's cost
 * depends on headcount, package and pass tier, so any single figure shown next
 * to a card would either be wrong or need so many caveats it stops being
 * useful. `quoteBooking` on the booking page is the only place a customer sees
 * a price, and it's the real one.
 */

/* ------------------------------------------------------------------ */
/* Scheduling                                                          */
/* ------------------------------------------------------------------ */

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Weekday names for a locale.
 *
 * Built with `Intl` off a known Sunday rather than translated by hand, so the
 * Chinese names come out as 周日/周一 with no table to maintain. English keeps
 * the hard-coded array so its wording is bit-for-bit what it always was.
 */
function weekdayNames(lang: Locale, width: "long" | "short"): string[] {
  if (lang === "en") return width === "long" ? WEEKDAY_NAMES : WEEKDAY_SHORT;

  const format = new Intl.DateTimeFormat(htmlLang[lang], {
    weekday: width,
    timeZone: "UTC",
  });
  // 2023-01-01 was a Sunday, matching index 0 of the arrays above.
  return Array.from({ length: 7 }, (_, day) =>
    format.format(new Date(Date.UTC(2023, 0, 1 + day)))
  );
}

/** "8:00 PM", or "下午8:00" in Chinese. */
export function formatTime(minutes: number, lang: Locale = "en"): string {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;

  if (lang !== "en") {
    return new Intl.DateTimeFormat(htmlLang[lang], {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2023, 0, 1, hour24, minute)));
  }

  const suffix = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/** "8:00 PM – 10:00 PM" */
export function formatTimeRange(
  startMinutes: number,
  endMinutes: number,
  lang: Locale = "en"
): string {
  return `${formatTime(startMinutes, lang)} – ${formatTime(endMinutes, lang)}`;
}

/** "HH:MM:SS", the shape Postgres `time` wants. */
export function toTimeString(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(
    2,
    "0"
  )}:00`;
}

/** "20:00:00" -> 1200. Tolerates the "20:00" Postgres sometimes returns. */
export function fromTimeString(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** ["Tue", "Thu", "Sun"] — the days this runs, Monday-first to match the calendar. */
export function scheduleWeekdays(experience: Experience, lang: Locale = "en"): string[] {
  const names = weekdayNames(lang, "short");
  const weekdays = [...new Set(experience.sessions.map((session) => session.weekday))];
  // (day + 6) % 7 puts Monday at 0 and Sunday at 6.
  weekdays.sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  return weekdays.map((day) => names[day]);
}

/** "Tuesday & Thursday" */
function joinWeekdays(weekdays: number[], lang: Locale): string {
  const all = weekdayNames(lang, "long");
  return phrases(lang).joinList(weekdays.map((day) => all[day]));
}

/**
 * The recurring-schedule blurb, e.g.
 * "Tuesday & Thursday 8:00 PM – 10:00 PM · Sunday 1:00 PM – 3:00 PM".
 *
 * Days running an identical set of times are collapsed together so a schedule
 * reads the way someone would say it out loud, rather than repeating the same
 * range once per weekday.
 */
export function describeSchedule(experience: Experience, lang: Locale = "en"): string {
  const timesByWeekday = new Map<number, string[]>();

  for (const session of experience.sessions) {
    const times = timesByWeekday.get(session.weekday) ?? [];
    times.push(formatTimeRange(session.startMinutes, session.endMinutes, lang));
    timesByWeekday.set(session.weekday, times);
  }

  const groups: { weekdays: number[]; times: string }[] = [];

  for (const [weekday, times] of timesByWeekday) {
    const label = times.join(", ");
    const existing = groups.find((group) => group.times === label);
    if (existing) existing.weekdays.push(weekday);
    else groups.push({ weekdays: [weekday], times: label });
  }

  return groups
    .map((group) => `${joinWeekdays(group.weekdays, lang)} ${group.times}`)
    .join(phrases(lang).separator);
}

/* ---- Calendar-date arithmetic ----
 * Dates are handled as plain "YYYY-MM-DD" strings anchored to UTC midnight, so
 * the server's own timezone can never shift a session onto the wrong day.
 */

export function todayInMalaysia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EXPERIENCE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const shifted = parseDate(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return toDateString(shifted);
}

/** "Sun, 9 Aug 2026", or "2026年8月9日周日" in Chinese. */
export function formatDateLong(date: string, lang: Locale = "en"): string {
  return parseDate(date).toLocaleDateString(lang === "en" ? "en-MY" : htmlLang[lang], {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * The real instant a Malaysian wall-clock session starts.
 *
 * Malaysia is a fixed UTC+8 with no daylight saving, so the offset can simply
 * be subtracted — no timezone database lookup is needed to get this right.
 */
export function sessionInstant(date: string, minutes: number): Date {
  return new Date(parseDate(date).getTime() + (minutes - 8 * 60) * 60_000);
}

export type BookingWindow = { earliest: string; latest: string };

/**
 * The dates a customer may pick from: the lead-time/horizon rules, narrowed to
 * their trip when we know it — a pass covers a stay, so there's no sense
 * offering sessions the customer won't be in the country for.
 */
export function resolveBookingWindow(
  trip: { arrivalDate: string | null; departureDate: string | null },
  today: string = todayInMalaysia()
): BookingWindow {
  let earliest = addDays(today, BOOKING_LEAD_DAYS);
  let latest = addDays(today, BOOKING_WINDOW_DAYS);

  if (trip.arrivalDate && trip.arrivalDate > earliest) earliest = trip.arrivalDate;
  if (trip.departureDate && trip.departureDate < latest) latest = trip.departureDate;

  return { earliest, latest };
}

export type ExperienceSlot = {
  date: string;
  startMinutes: number;
  endMinutes: number;
  /** Posted by the booking form and re-validated server-side. */
  value: string;
};

/** "2026-08-19|1200" — date and start time in one form value. */
export function slotValue(date: string, startMinutes: number): string {
  return `${date}|${startMinutes}`;
}

/**
 * Every session of this experience inside the window, keyed by date. Feeds the
 * portal calendar directly, and is the list the server checks a submitted slot
 * against.
 */
export function listSlotsByDate(
  experience: Experience,
  window: BookingWindow
): Record<string, ExperienceSlot[]> {
  const byDate: Record<string, ExperienceSlot[]> = {};

  if (window.latest < window.earliest) return byDate;

  for (let date = window.earliest; date <= window.latest; date = addDays(date, 1)) {
    const weekday = parseDate(date).getUTCDay();
    const sessions = experience.sessions.filter((session) => session.weekday === weekday);

    if (sessions.length === 0) continue;

    byDate[date] = sessions.map((session) => ({
      date,
      startMinutes: session.startMinutes,
      endMinutes: session.endMinutes,
      value: slotValue(date, session.startMinutes),
    }));
  }

  return byDate;
}

/**
 * The soonest bookable date, or null when nothing falls inside the window.
 * `listSlotsByDate` walks the window forwards, so the first key is the answer.
 */
export function nextAvailableDate(experience: Experience, window: BookingWindow): string | null {
  return Object.keys(listSlotsByDate(experience, window))[0] ?? null;
}

/** "Sat 15 Aug" — the compact form used on browse cards. */
export function formatDateShort(date: string, lang: Locale = "en"): string {
  return parseDate(date).toLocaleDateString(lang === "en" ? "en-MY" : htmlLang[lang], {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
