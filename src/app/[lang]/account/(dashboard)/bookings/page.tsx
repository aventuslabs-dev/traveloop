import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "@/i18n/Link";
import { createClient } from "@/lib/supabase/server";
import { getBookingsByUserId, type StoredBooking } from "@/lib/experience-bookings-db";
import { isCancellableByCustomer, isPastSession } from "@/lib/booking";
import { cancelBooking } from "@/app/[lang]/account/booking-actions";
import { Icon } from "@/app/components/Icons";
import {
  CANCELLATION_CUTOFF_HOURS,
  formatDateLong,
  formatPrice,
  formatTimeRange,
  getLocalizedExperience,
} from "@/app/data/experiences";
import { localizedPassName } from "@/app/data/passes";
import { localePage, type LangParams } from "@/i18n/page";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";
import { count, fill } from "@/i18n/interpolate";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return {
    title: dict.account.bookings.title,
    robots: { index: false, follow: false },
  };
}

type BookingsPageProps = LangParams & {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type BookingsCopy = Dictionary["account"]["bookings"];

/**
 * The experience's name in the reader's language.
 *
 * `experienceName` on the row is a snapshot of what it was called in English
 * when the booking was made — kept because it is what our records and the
 * venue's say. What the customer is shown is looked up live from the
 * catalogue, falling back to the stored name if the experience has since been
 * retired from it.
 */
function experienceName(booking: StoredBooking, lang: Locale): string {
  return getLocalizedExperience(booking.experienceKey, lang)?.name ?? booking.experienceName;
}

function BookingCard({
  booking,
  t,
  lang,
}: {
  booking: StoredBooking;
  t: BookingsCopy;
  lang: Locale;
}) {
  const cancellable = isCancellableByCustomer(booking);
  const showCalendar = booking.status === "confirmed" && !isPastSession(booking);

  return (
    <article className={`xp-booking status-${booking.status}`}>
      <div className="xp-booking-head">
        <span className={`xp-booking-status status-${booking.status}`}>
          {t.status[booking.status]}
        </span>
        <span className="xp-booking-ref">{booking.reference}</span>
      </div>

      <h3>{experienceName(booking, lang)}</h3>

      <dl className="xp-booking-facts">
        <div>
          <dt>{t.card.date}</dt>
          <dd>{formatDateLong(booking.sessionDate, lang)}</dd>
        </div>
        <div>
          <dt>{t.card.time}</dt>
          <dd>{formatTimeRange(booking.startMinutes, booking.endMinutes, lang)}</dd>
        </div>
        <div>
          <dt>{t.card.venue}</dt>
          <dd>{booking.location ?? t.card.venueTbc}</dd>
        </div>
        <div>
          <dt>{t.card.participants}</dt>
          <dd>
            {booking.participants}
            {booking.childrenCount > 0 && count(t.card.plusChildren, booking.childrenCount)}
          </dd>
        </div>
        <div>
          <dt>{booking.status === "cancelled" ? t.card.wasQuoted : t.card.payAtVenue}</dt>
          <dd>{formatPrice(booking.quotedAmountCents)}</dd>
        </div>
        <div>
          <dt>{t.card.bookedWith}</dt>
          <dd className="xp-booking-pass">
            {fill(t.card.pass, { pass: localizedPassName(booking.passKey, lang, booking.passKey) })}
          </dd>
        </div>
      </dl>

      {booking.adminNotes && <p className="xp-booking-note">{booking.adminNotes}</p>}

      {(showCalendar || cancellable) && (
        <div className="xp-booking-actions">
          {showCalendar && (
            <a
              className="button ghost dark"
              href={`/api/bookings/${booking.reference}/calendar`}
              download
            >
              <Icon name="clock" />
              {t.card.addToCalendar}
            </a>
          )}
          {cancellable && (
            <form action={cancelBooking}>
              <input type="hidden" name="reference" value={booking.reference} />
              <button className="xp-booking-cancel" type="submit">
                {t.card.cancel}
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}

export default async function BookingsPage({ params, searchParams }: BookingsPageProps) {
  const { lang, dict } = await localePage(params);
  const t = dict.account.bookings;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${lang}/account/login`);
  }

  const query = await searchParams;
  const justBooked = typeof query.booked === "string" ? query.booked : null;
  const justCancelled = typeof query.cancelled === "string" ? query.cancelled : null;
  const cancelError = typeof query.cancelError === "string" ? query.cancelError : null;

  const bookings = await getBookingsByUserId(user.id);

  // A cancelled session still belongs in "past" once its date has gone, so it
  // doesn't clutter the list the traveller is actually planning around.
  const upcoming = bookings.filter((b) => b.status !== "cancelled" && !isPastSession(b));
  const past = bookings
    .filter((b) => b.status === "cancelled" || isPastSession(b))
    .reverse();

  return (
    <>
      <header className="account-greeting">
        <p className="account-eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p>{t.lede}</p>
      </header>

      {justBooked && (
        <p className="account-flash is-success">
          <Icon name="check" />
          {fill(t.flashBooked, { reference: justBooked })}
        </p>
      )}
      {justCancelled && (
        <p className="account-flash is-success">
          <Icon name="check" />
          {fill(t.flashCancelled, { reference: justCancelled })}
        </p>
      )}
      {cancelError === "late" && (
        <p className="account-flash is-error">
          <Icon name="alert" />
          {fill(t.flashTooLate, { hours: CANCELLATION_CUTOFF_HOURS })}
        </p>
      )}
      {cancelError === "1" && (
        <p className="account-flash is-error">
          <Icon name="alert" />
          {t.flashCancelFailed}
        </p>
      )}

      <section className="account-section">
        <div className="account-section-head">
          <h2>{t.upcoming}</h2>
          {upcoming.length > 0 && <span className="account-count">{upcoming.length}</span>}
        </div>

        {upcoming.length === 0 ? (
          <div className="account-empty">
            <span className="account-empty-icon" aria-hidden="true">
              <Icon name="calendar" />
            </span>
            <p>{t.emptyTitle}</p>
            <Link className="button primary" href="/account/experiences">
              {t.browseExperiences}
            </Link>
          </div>
        ) : (
          <div className="xp-booking-list">
            {upcoming.map((booking) => (
              <BookingCard key={booking.reference} booking={booking} t={t} lang={lang} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="account-section">
          <div className="account-section-head">
            <h2>{t.pastAndCancelled}</h2>
          </div>
          <div className="xp-booking-list">
            {past.map((booking) => (
              <BookingCard key={booking.reference} booking={booking} t={t} lang={lang} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
