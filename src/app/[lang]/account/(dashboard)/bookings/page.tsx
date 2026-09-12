import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
} from "@/app/data/experiences";

export const metadata: Metadata = {
  title: "My bookings",
  robots: { index: false, follow: false },
};

type BookingsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const STATUS_COPY: Record<StoredBooking["status"], string> = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

function BookingCard({ booking }: { booking: StoredBooking }) {
  const cancellable = isCancellableByCustomer(booking);
  const showCalendar = booking.status === "confirmed" && !isPastSession(booking);

  return (
    <article className={`xp-booking status-${booking.status}`}>
      <div className="xp-booking-head">
        <span className={`xp-booking-status status-${booking.status}`}>
          {STATUS_COPY[booking.status]}
        </span>
        <span className="xp-booking-ref">{booking.reference}</span>
      </div>

      <h3>{booking.experienceName}</h3>

      <dl className="xp-booking-facts">
        <div>
          <dt>Date</dt>
          <dd>{formatDateLong(booking.sessionDate)}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{formatTimeRange(booking.startMinutes, booking.endMinutes)}</dd>
        </div>
        <div>
          <dt>Venue</dt>
          <dd>{booking.location ?? "Confirmed by our team"}</dd>
        </div>
        <div>
          <dt>Participants</dt>
          <dd>
            {booking.participants}
            {booking.childrenCount > 0 && ` + ${booking.childrenCount} child (free)`}
          </dd>
        </div>
        <div>
          <dt>{booking.status === "cancelled" ? "Was quoted" : "Pay at the venue"}</dt>
          <dd>{formatPrice(booking.quotedAmountCents)}</dd>
        </div>
        <div>
          <dt>Booked with</dt>
          <dd className="xp-booking-pass">{booking.passKey} Pass</dd>
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
              Add to calendar
            </a>
          )}
          {cancellable && (
            <form action={cancelBooking}>
              <input type="hidden" name="reference" value={booking.reference} />
              <button className="xp-booking-cancel" type="submit">
                Cancel booking
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login");
  }

  const params = await searchParams;
  const justBooked = typeof params.booked === "string" ? params.booked : null;
  const justCancelled = typeof params.cancelled === "string" ? params.cancelled : null;
  const cancelError = typeof params.cancelError === "string" ? params.cancelError : null;

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
        <p className="account-eyebrow">Cultural experiences</p>
        <h1>My bookings</h1>
        <p>Your booked sessions. Payment is made at the venue on the day.</p>
      </header>

      {justBooked && (
        <p className="account-flash is-success">
          <Icon name="check" />
          Booking {justBooked} received — we&apos;ve emailed you the details and will confirm the
          session shortly.
        </p>
      )}
      {justCancelled && (
        <p className="account-flash is-success">
          <Icon name="check" />
          Booking {justCancelled} was cancelled.
        </p>
      )}
      {cancelError === "late" && (
        <p className="account-flash is-error">
          <Icon name="alert" />
          That session is less than {CANCELLATION_CUTOFF_HOURS} hours away, so it can&apos;t be
          cancelled online. Please contact us and we&apos;ll sort it out.
        </p>
      )}
      {cancelError === "1" && (
        <p className="account-flash is-error">
          <Icon name="alert" />
          We couldn&apos;t cancel that booking. Please try again.
        </p>
      )}

      <section className="account-section">
        <div className="account-section-head">
          <h2>Upcoming</h2>
          {upcoming.length > 0 && <span className="account-count">{upcoming.length}</span>}
        </div>

        {upcoming.length === 0 ? (
          <div className="account-empty">
            <span className="account-empty-icon" aria-hidden="true">
              <Icon name="calendar" />
            </span>
            <p>No sessions booked yet.</p>
            <Link className="button primary" href="/account/experiences">
              Browse experiences
            </Link>
          </div>
        ) : (
          <div className="xp-booking-list">
            {upcoming.map((booking) => (
              <BookingCard key={booking.reference} booking={booking} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="account-section">
          <div className="account-section-head">
            <h2>Past &amp; cancelled</h2>
          </div>
          <div className="xp-booking-list">
            {past.map((booking) => (
              <BookingCard key={booking.reference} booking={booking} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
