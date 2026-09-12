import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrdersByUserId, type StoredOrder } from "@/lib/orders-db";
import { bestOrderFor } from "@/lib/booking";
import { Icon } from "@/app/components/Icons";
import {
  BOOKING_LEAD_DAYS,
  describeSchedule,
  experiences,
  formatDateShort,
  nextAvailableDate,
  resolveBookingWindow,
  scheduleWeekdays,
  type Experience,
} from "@/app/data/experiences";
import { passTiers } from "@/app/data/passes";

export const metadata: Metadata = {
  title: "Cultural experiences",
  robots: { index: false, follow: false },
};

/** "Silver, Gold & Platinum" — the tiers an experience is included with. */
function includedWith(experience: Experience): string {
  const names = passTiers
    .filter((tier) => experience.discountByTier[tier.key] !== undefined)
    .map((tier) => tier.name);

  return names.length > 1 ? `${names.slice(0, -1).join(", ")} & ${names.at(-1)}` : names[0];
}

export default async function ExperiencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login");
  }

  const orders = await getOrdersByUserId(user.id);

  if (orders.length === 0) {
    return (
      <>
        <header className="account-greeting">
          <p className="account-eyebrow">Included with your pass</p>
          <h1>Cultural experiences</h1>
          <p>Hands-on sessions across Penang, included with your Traveloop pass.</p>
        </header>
        <div className="account-empty">
          <span className="account-empty-icon" aria-hidden="true">
            <Icon name="compass" />
          </span>
          <p>You&apos;ll be able to book experiences once you have a pass.</p>
          <Link className="button primary" href="/passes">
            Browse passes
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
      passName: order?.passName ?? null,
      // Narrowed to the trip on the pass they'd actually book with, so the
      // date shown is one they can really pick.
      nextDate: nextAvailableDate(experience, order ? resolveBookingWindow(order) : openWindow),
    };
  });

  const unlockedCount = cards.filter((card) => card.unlocked).length;

  return (
    <>
      <header className="account-greeting">
        <p className="account-eyebrow">Included with your pass</p>
        <h1>Cultural experiences</h1>
        <p>
          {unlockedCount} of {cards.length} experiences are included with your pass. Book at least{" "}
          {BOOKING_LEAD_DAYS} days ahead — your pass discount is applied at booking, and you pay at
          the venue on the day.
        </p>
      </header>

      <div className="xp-grid">
        {cards.map(({ experience, unlocked, passName, nextDate }) => (
          <article key={experience.key} className={`xp-card${unlocked ? "" : " is-locked"}`}>
            <div className="xp-card-media">
              <Image src={experience.image} alt="" fill sizes="(max-width: 720px) 100vw, 360px" />
              <span className={`xp-card-badge${unlocked ? "" : " is-locked"}`}>
                <Icon name={unlocked ? "ticket" : "shield"} />
                {unlocked ? `Included with ${passName}` : `${includedWith(experience)} only`}
              </span>
            </div>

            <div className="xp-card-body">
              <h2>{experience.name}</h2>
              <p className="xp-card-tagline">{experience.tagline}</p>

              <ul className="xp-card-facts">
                <li>
                  <Icon name="clock" />
                  <span title={describeSchedule(experience)}>
                    <span className="xp-day-pills">
                      {scheduleWeekdays(experience).map((day) => (
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
                        Next session <strong>{formatDateShort(nextDate)}</strong>
                      </>
                    ) : (
                      "No sessions in your travel window"
                    )}
                  </span>
                </li>
              </ul>

              {unlocked ? (
                <Link
                  className="button primary xp-card-cta"
                  href={`/account/experiences/${experience.key}`}
                >
                  Check dates &amp; price
                  <Icon name="arrowRight" />
                </Link>
              ) : (
                <div className="xp-card-locked">
                  <p>Not included with your pass — upgrade to unlock it.</p>
                  <Link className="button ghost dark" href="/passes#pricing">
                    Compare passes
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
