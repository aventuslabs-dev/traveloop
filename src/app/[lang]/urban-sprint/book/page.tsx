import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";
import { getDictionary } from "@/i18n/dictionaries";
import {
  SLOT_CAPACITY,
  TEAM_PRICE_CENTS,
  TEAM_SIZE_MAX,
  TEAM_SIZE_MIN,
  formatRinggit,
} from "@/lib/urban-sprint/booking-config";
import { getAvailability, type DayAvailability } from "@/lib/urban-sprint/bookings-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { Empty, Wordmark } from "../_components/ui";
import BookingForm from "./BookingForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return {
    title: "Book your team",
    description: `Book an Urban Sprint race for a team of ${TEAM_SIZE_MIN}–${TEAM_SIZE_MAX}. ${formatRinggit(
      TEAM_PRICE_CENTS
    )} per team, five daily start times in George Town.`,
    alternates: localeAlternates(lang, "/urban-sprint/book"),
  };
}

/**
 * The campaign's main call to action: pick a slot, name the team, register
 * everyone on it, pay.
 *
 * Availability is read per request — searchParams already makes this page
 * dynamic — and is only ever advisory. The database decides whether the last
 * place is still there at the moment the booking is written.
 */
export default async function UrbanSprintBookPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const cancelled =
    typeof params.cancelled === "string" && /^US-[A-Z0-9]{8}$/.test(params.cancelled)
      ? params.cancelled
      : null;

  // Campaign copy is English-only (see the urban-sprint layout), so the pass
  // terms are the English ones whichever /lang the page is under.
  const [settings, availability, dict] = await Promise.all([
    getSettings(),
    getAvailability().catch((error): DayAvailability[] | null => {
      console.error("[us-book] Couldn't load availability:", error);
      return null;
    }),
    getDictionary("en"),
  ]);

  return (
    <main className="us-public us-light">
      <header className="us-topbar">
        <Wordmark tone="light" />
        <nav className="us-topbar-nav" aria-label="Urban Sprint">
          <Link href="/urban-sprint">The race</Link>
          <Link href="/urban-sprint#leaderboard">Leaderboard</Link>
        </nav>
        <Link className="us-btn us-btn-ghost us-btn-sm" href="/urban-sprint/login">
          Team login
        </Link>
      </header>

      <div className="us-shell us-book">
        <header className="us-book-head">
          <p className="us-kicker">Book your team</p>
          <h1>
            Get your crew <em>on the start line.</em>
          </h1>
          <ul className="us-book-facts">
            <li>
              <b>{formatRinggit(TEAM_PRICE_CENTS)}</b> per team
            </li>
            <li>
              <b>
                {TEAM_SIZE_MIN}–{TEAM_SIZE_MAX}
              </b>{" "}
              people
            </li>
            <li>
              <b>{SLOT_CAPACITY}</b> teams per slot
            </li>
            <li>
              <b>Platinum Pass</b> for every racer
            </li>
            <li>No team leader needed</li>
          </ul>
        </header>

        {availability ? (
          <BookingForm
            availability={availability}
            cancelledReference={cancelled}
            consentText={settings.consentText}
            consentVersion={settings.consentVersion}
            rulesText={settings.rulesText}
            insurance={dict.insurance}
            passConsentText={dict.registration.terms.consent}
          />
        ) : (
          <Empty title="Booking is unavailable right now">
            We couldn&rsquo;t load the race calendar. Please refresh in a minute.
          </Empty>
        )}
      </div>
    </main>
  );
}
