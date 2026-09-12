import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrdersByUserId, type StoredOrder } from "@/lib/orders-db";
import { getCustomerProfile } from "@/lib/customer-profile-db";
import { getPassRegistrationsByUserId, type StoredPassRegistration } from "@/lib/pass-registrations-db";
import { getBookingsByUserId } from "@/lib/experience-bookings-db";
import { accessForExperiences, isPastSession } from "@/lib/booking";
import {
  describeSchedule,
  formatDateLong,
  formatTimeRange,
  parseDate,
  todayInMalaysia,
} from "@/app/data/experiences";
import { Icon } from "@/app/components/Icons";
import { profileCompleteness } from "@/app/[lang]/account/profile-summary";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

function formatTotal(order: StoredOrder): string {
  return `${order.currency.toUpperCase()} ${(order.amountTotal / 100).toFixed(2)}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "1 Sep 2026 – 10 Sep 2026", or null for orders placed before trip dates were collected. */
function formatTrip(order: StoredOrder): string | null {
  if (!order.arrivalDate || !order.departureDate) return null;
  return `${formatDate(order.arrivalDate)} – ${formatDate(order.departureDate)}`;
}

const DAY_MS = 86_400_000;

/**
 * Turns the trip dates on the active pass into a single at-a-glance line —
 * a countdown before arrival, a "you're here" while it runs, and the end date
 * once it's over.
 */
function tripStat(order: StoredOrder | undefined): { label: string; value: string } | null {
  if (!order?.arrivalDate || !order.departureDate) return null;

  const today = todayInMalaysia();

  if (today < order.arrivalDate) {
    const days = Math.round(
      (parseDate(order.arrivalDate).getTime() - parseDate(today).getTime()) / DAY_MS
    );
    return {
      label: "Trip starts",
      value: days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`,
    };
  }

  if (today <= order.departureDate) {
    const days = Math.round(
      (parseDate(order.departureDate).getTime() - parseDate(today).getTime()) / DAY_MS
    );
    return { label: "Your trip", value: days === 0 ? "Last day" : `${days} days left` };
  }

  return { label: "Trip ended", value: formatDate(order.departureDate) };
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login");
  }

  const [orders, profile, bookings, passRegistrations] = await Promise.all([
    getOrdersByUserId(user.id),
    getCustomerProfile(user.id),
    getBookingsByUserId(user.id),
    getPassRegistrationsByUserId(user.id),
  ]);
  const [currentPass, ...history] = orders;

  const registrantsByOrder = new Map<string, StoredPassRegistration[]>();
  for (const reg of passRegistrations) {
    const list = registrantsByOrder.get(reg.orderSessionId) ?? [];
    list.push(reg);
    registrantsByOrder.set(reg.orderSessionId, list);
  }
  function registrantNames(order: StoredOrder): string | null {
    if (order.quantity <= 1) return null;
    const names = registrantsByOrder.get(order.sessionId)?.map((r) => r.fullName);
    return names && names.length > 0 ? names.join(", ") : null;
  }

  const firstName = profile?.fullName?.trim().split(" ")[0];
  const completeness = profileCompleteness(profile);

  const upcoming = bookings.filter((b) => b.status !== "cancelled" && !isPastSession(b));
  // getBookingsByUserId returns soonest-first, so the first live future
  // booking is the one worth surfacing on the dashboard.
  const nextBooking = upcoming[0];
  const unlocked = accessForExperiences(orders).filter((item) => item.order);

  const trip = tripStat(currentPass);

  return (
    <>
      <header className="account-greeting">
        <p className="account-eyebrow">Traveloop portal</p>
        <h1>{firstName ? `Welcome back, ${firstName}.` : "Welcome back."}</h1>
        <p>Your pass, your bookings and your details — all in one place.</p>
      </header>

      {currentPass && !completeness.isComplete && (
        <Link className="account-prompt" href="/account/details">
          <span className="account-prompt-icon" aria-hidden="true">
            <Icon name={completeness.isEmpty ? "user" : "alert"} />
          </span>
          <span className="account-prompt-main">
            <strong>
              {completeness.isEmpty
                ? "Finish your registration details"
                : `${completeness.total - completeness.filled} detail${
                    completeness.total - completeness.filled === 1 ? "" : "s"
                  } still missing`}
            </strong>
            <span>
              Your pass and travel insurance cover rely on these being complete and accurate.
            </span>
          </span>
          <Icon name="arrowRight" />
        </Link>
      )}

      <section className="account-section">
        <div className="account-section-head">
          <h2>Your current pass</h2>
          {orders.length > 0 && (
            <span className="account-count">
              {orders.length} purchase{orders.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {currentPass ? (
          <>
            <article className={`account-pass-card tier-${currentPass.passKey}`}>
              <div className="account-pass-head">
                <span className="account-pass-badge">Active</span>
                <span className="account-pass-invoice">{currentPass.invoiceNumber || "—"}</span>
              </div>

              <p className="account-pass-name">
                {currentPass.quantity > 1 ? currentPass.passName : `${currentPass.passName} Pass`}
              </p>
              {registrantNames(currentPass) && (
                <p className="account-pass-registrants">Registered: {registrantNames(currentPass)}</p>
              )}

              <dl className="account-pass-facts">
                <div>
                  <dt>Purchased</dt>
                  <dd>{formatDate(currentPass.createdAt)}</dd>
                </div>
                <div>
                  <dt>Total paid</dt>
                  <dd>{formatTotal(currentPass)}</dd>
                </div>
                {formatTrip(currentPass) && (
                  <div className="account-pass-fact-wide">
                    <dt>Trip dates</dt>
                    <dd>{formatTrip(currentPass)}</dd>
                  </div>
                )}
              </dl>

              <a
                className="account-pass-invoice-link"
                href={`/api/orders/${currentPass.sessionId}/invoice?format=pdf`}
              >
                <Icon name="receipt" />
                Download invoice
              </a>
            </article>

            <ul className="account-stats">
              {trip && (
                <li>
                  <span className="account-stat-icon" aria-hidden="true">
                    <Icon name="calendar" />
                  </span>
                  <span className="account-stat-main">
                    <strong>{trip.value}</strong>
                    <span>{trip.label}</span>
                  </span>
                </li>
              )}
              <li>
                <span className="account-stat-icon" aria-hidden="true">
                  <Icon name="clock" />
                </span>
                <span className="account-stat-main">
                  <strong>{upcoming.length}</strong>
                  <span>Upcoming session{upcoming.length === 1 ? "" : "s"}</span>
                </span>
              </li>
              <li>
                <span className="account-stat-icon" aria-hidden="true">
                  <Icon name="compass" />
                </span>
                <span className="account-stat-main">
                  <strong>{unlocked.length}</strong>
                  <span>Experience{unlocked.length === 1 ? "" : "s"} included</span>
                </span>
              </li>
            </ul>
          </>
        ) : (
          <div className="account-empty">
            <span className="account-empty-icon" aria-hidden="true">
              <Icon name="ticket" />
            </span>
            <p>You don&apos;t have any passes yet.</p>
            <Link className="button primary" href="/passes">
              Browse passes
            </Link>
          </div>
        )}
      </section>

      {unlocked.length > 0 && (
        <section className="account-section">
          <div className="account-section-head">
            <h2>Cultural experiences</h2>
            <Link className="account-section-link" href="/account/experiences">
              See all
              <Icon name="arrowRight" />
            </Link>
          </div>

          {nextBooking && (
            <Link className="xp-next" href="/account/bookings">
              <span className="xp-next-icon" aria-hidden="true">
                <Icon name="clock" />
              </span>
              <span className="xp-next-main">
                <span className="xp-next-label">Your next session</span>
                <strong>{nextBooking.experienceName}</strong>
                <span>
                  {formatDateLong(nextBooking.sessionDate)} ·{" "}
                  {formatTimeRange(nextBooking.startMinutes, nextBooking.endMinutes)} ·{" "}
                  {nextBooking.status === "confirmed" ? "Confirmed" : "Awaiting confirmation"}
                </span>
              </span>
              <Icon name="arrowRight" />
            </Link>
          )}

          <p className="account-section-lede">
            Included with your pass — book a session and pay at the venue on the day.
          </p>

          <ul className="xp-mini-list">
            {unlocked.map(({ experience }) => (
              <li key={experience.key}>
                <Link href={`/account/experiences/${experience.key}`}>
                  <span className="xp-mini-icon" aria-hidden="true">
                    <Icon name={experience.icon} />
                  </span>
                  <span className="xp-mini-main">
                    <strong>{experience.name}</strong>
                    <span>{describeSchedule(experience)}</span>
                  </span>
                  <Icon name="arrowRight" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section className="account-section">
          <div className="account-section-head">
            <h2>Purchase history</h2>
          </div>
          <ul className="account-history">
            {history.map((order) => (
              <li key={order.sessionId} className="account-history-item">
                <span
                  className={`account-history-swatch swatch-${order.passKey}`}
                  aria-hidden="true"
                />
                <div className="account-history-main">
                  <p className="account-history-name">
                    {order.quantity > 1 ? order.passName : `${order.passName} Pass`}
                  </p>
                  <p className="account-history-meta">
                    {formatDate(order.createdAt)} · {formatTotal(order)}
                    {formatTrip(order) ? ` · Trip ${formatTrip(order)}` : ""}
                  </p>
                  {registrantNames(order) && (
                    <p className="account-history-meta">Registered: {registrantNames(order)}</p>
                  )}
                </div>
                <a
                  className="admin-icon-button"
                  href={`/api/orders/${order.sessionId}/invoice?format=pdf`}
                  title={`Download invoice ${order.invoiceNumber}`}
                  aria-label={`Download invoice ${order.invoiceNumber}`}
                >
                  <Icon name="receipt" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="account-section">
        <div className="account-section-head">
          <h2>Manage your account</h2>
        </div>
        <div className="account-tiles">
          <Link className="account-tile" href="/account/details">
            <span className="account-tile-icon" aria-hidden="true">
              <Icon name="user" />
            </span>
            <strong>My details</strong>
            <span>
              Registration details, emergency contact and the password you sign in with.
            </span>
            <span className="account-tile-cue">
              Open
              <Icon name="arrowRight" />
            </span>
          </Link>

          <Link className="account-tile" href="/contact">
            <span className="account-tile-icon" aria-hidden="true">
              <Icon name="headset" />
            </span>
            <strong>Need a hand?</strong>
            <span>Questions about your pass, a booking or your insurance cover — just ask.</span>
            <span className="account-tile-cue">
              Contact us
              <Icon name="arrowRight" />
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
