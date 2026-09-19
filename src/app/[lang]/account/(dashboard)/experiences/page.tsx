import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import Link from "@/i18n/Link";
import { createClient } from "@/lib/supabase/server";
import { getOrdersByUserId, type StoredOrder } from "@/lib/orders-db";
import { bestOrderFor } from "@/lib/booking";
import { Icon } from "@/app/components/Icons";
import {
  BOOKING_LEAD_DAYS,
  describeSchedule,
  formatDateShort,
  getExperiences,
  nextAvailableDate,
  resolveBookingWindow,
  scheduleWeekdays,
  type Experience,
} from "@/app/data/experiences";
import { getPassTiers, localizedPassName } from "@/app/data/passes";
import { localePage, type LangParams } from "@/i18n/page";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";
import { fill } from "@/i18n/interpolate";
import { phrases } from "@/app/data/phrases";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return {
    title: dict.account.experiences.title,
    robots: { index: false, follow: false },
  };
}

/** "Silver, Gold & Platinum" / "银卡、金卡和白金卡" — the tiers an experience is included with. */
function includedWith(experience: Experience, lang: Locale): string {
  const names = getPassTiers(lang)
    .filter((tier) => experience.discountByTier[tier.key] !== undefined)
    .map((tier) => tier.name);

  return phrases(lang).joinList(names);
}

export default async function ExperiencesPage({ params }: LangParams) {
  const { lang, dict } = await localePage(params);
  const t = dict.account.experiences;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${lang}/account/login`);
  }

  const orders = await getOrdersByUserId(user.id);
  const experiences = getExperiences(lang);

  if (orders.length === 0) {
    return (
      <>
        <header className="account-greeting">
          <p className="account-eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p>{t.ledeNoPass}</p>
        </header>
        <div className="account-empty">
          <span className="account-empty-icon" aria-hidden="true">
            <Icon name="compass" />
          </span>
          <p>{t.emptyTitle}</p>
          <Link className="button primary" href="/passes">
            {t.browsePasses}
          </Link>
        </div>
      </>
    );
  }

  // Dates only — no prices. What a session costs depends on headcount, package
  // and tier, so it's worked out on the booking page rather than guessed here.
  const openWindow = resolveBookingWindow({ arrivalDate: null, departureDate: null });

  const cards = experiences.map((experience) => {
    const order: StoredOrder | null = bestOrderFor(experience, orders);

    return {
      experience,
      unlocked: order !== null,
      passName: order ? localizedPassName(order.passKey, lang, order.passName) : null,
      // Narrowed to the trip on the pass they'd actually book with, so the
      // date shown is one they can really pick.
      nextDate: nextAvailableDate(experience, order ? resolveBookingWindow(order) : openWindow),
    };
  });

  const unlockedCount = cards.filter((card) => card.unlocked).length;

  return (
    <>
      <header className="account-greeting">
        <p className="account-eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p>
          {fill(t.lede, {
            unlocked: unlockedCount,
            total: cards.length,
            days: BOOKING_LEAD_DAYS,
          })}
        </p>
      </header>

      <div className="xp-grid">
        {cards.map(({ experience, unlocked, passName, nextDate }) => (
          <article key={experience.key} className={`xp-card${unlocked ? "" : " is-locked"}`}>
            <div className="xp-card-media">
              <Image src={experience.image} alt="" fill sizes="(max-width: 720px) 100vw, 360px" />
              <span className={`xp-card-badge${unlocked ? "" : " is-locked"}`}>
                <Icon name={unlocked ? "ticket" : "shield"} />
                {unlocked
                  ? fill(t.card.included, { pass: passName! })
                  : fill(t.card.tiersOnly, { tiers: includedWith(experience, lang) })}
              </span>
            </div>

            <div className="xp-card-body">
              <h2>{experience.name}</h2>
              <p className="xp-card-tagline">{experience.tagline}</p>

              <ul className="xp-card-facts">
                <li>
                  <Icon name="clock" />
                  <span title={describeSchedule(experience, lang)}>
                    <span className="xp-day-pills">
                      {scheduleWeekdays(experience, lang).map((day) => (
                        <span key={day}>{day}</span>
                      ))}
                    </span>
                    {experience.durationLabel}
                  </span>
                </li>
                <li>
                  <Icon name="pin" />
                  <span>{experience.venue ?? experience.venueNote}</span>
                </li>
                <li>
                  <Icon name="compass" />
                  <span>
                    {nextDate ? (
                      <>
                        {t.card.nextSessionBefore}
                        <strong>{formatDateShort(nextDate, lang)}</strong>
                      </>
                    ) : (
                      t.card.noSessions
                    )}
                  </span>
                </li>
              </ul>

              {unlocked ? (
                <Link
                  className="button primary xp-card-cta"
                  href={`/account/experiences/${experience.key}`}
                >
                  {t.card.cta}
                  <Icon name="arrowRight" />
                </Link>
              ) : (
                <div className="xp-card-locked">
                  <p>{t.card.lockedNote}</p>
                  <Link className="button ghost dark" href="/passes#pricing">
                    {t.card.comparePasses}
                  </Link>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
