import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "@/i18n/Link";
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
  getLocalizedExperience,
  localizeExperience,
  parseDate,
  todayInMalaysia,
} from "@/app/data/experiences";
import { localizedPassName } from "@/app/data/passes";
import { Icon } from "@/app/components/Icons";
import { profileCompleteness } from "@/app/[lang]/account/profile-summary";
import { localePage, type LangParams } from "@/i18n/page";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { isLocale, htmlLang, type Locale } from "@/i18n/config";
import { count, fill } from "@/i18n/interpolate";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return {
    title: dict.account.overview.title,
    robots: { index: false, follow: false },
  };
}

function formatTotal(order: StoredOrder): string {
  return `${order.currency.toUpperCase()} ${(order.amountTotal / 100).toFixed(2)}`;
}

function formatDate(value: string, lang: Locale): string {
  return new Date(value).toLocaleDateString(lang === "en" ? "en-MY" : htmlLang[lang], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "1 Sep 2026 – 10 Sep 2026", or null for orders placed before trip dates were collected. */
function formatTrip(order: StoredOrder, lang: Locale): string | null {
  if (!order.arrivalDate || !order.departureDate) return null;
  return `${formatDate(order.arrivalDate, lang)} – ${formatDate(order.departureDate, lang)}`;
}

const DAY_MS = 86_400_000;

/**
 * Turns the trip dates on the active pass into a single at-a-glance line —
 * a countdown before arrival, a "you're here" while it runs, and the end date
 * once it's over.
 */
function tripStat(
  order: StoredOrder | undefined,
  t: Dictionary["account"]["overview"]["stats"],
  lang: Locale
): { label: string; value: string } | null {
  if (!order?.arrivalDate || !order.departureDate) return null;

  const today = todayInMalaysia();

  if (today < order.arrivalDate) {
    const days = Math.round(
      (parseDate(order.arrivalDate).getTime() - parseDate(today).getTime()) / DAY_MS
    );
    return {
      label: t.tripStarts,
      value:
        days === 0
          ? t.tripStartsToday
          : days === 1
            ? t.tripStartsTomorrow
            : count(t.tripStartsIn, days),
    };
  }

  if (today <= order.departureDate) {
    const days = Math.round(
      (parseDate(order.departureDate).getTime() - parseDate(today).getTime()) / DAY_MS
    );
    return {
      label: t.tripRunning,
      value: days === 0 ? t.tripLastDay : count(t.tripDaysLeft, days),
    };
  }

  return { label: t.tripEnded, value: formatDate(order.departureDate, lang) };
}

export default async function AccountPage({ params }: LangParams) {
  const { lang, dict } = await localePage(params);
  const t = dict.account.overview;

  /**
   * What to call the pass on an order. A multi-pass order stores the literal
   * "3 passes" as its name, so the count is rebuilt from `quantity` rather
   * than shown; a single one is re-looked-up from `passKey`.
   */
  const passLabel = (order: StoredOrder): string =>
    order.quantity > 1
      ? count(dict.account.pass.count, order.quantity)
      : fill(dict.account.pass.label, {
          pass: localizedPassName(order.passKey, lang, order.passName),
        });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${lang}/account/login`);
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
  const completeness = profileCompleteness(profile, dict.account.profile.rows);

  const upcoming = bookings.filter((b) => b.status !== "cancelled" && !isPastSession(b));
  // getBookingsByUserId returns soonest-first, so the first live future
  // booking is the one worth surfacing on the dashboard.
  const nextBooking = upcoming[0];
  const unlocked = accessForExperiences(orders)
    .filter((item) => item.order)
    .map((item) => ({ ...item, experience: localizeExperience(item.experience, lang) }));

  const trip = tripStat(currentPass, t.stats, lang);

  return (
    <>
      <header className="account-greeting">
        <p className="account-eyebrow">{t.eyebrow}</p>
        <h1>{firstName ? fill(t.welcomeNamed, { name: firstName }) : t.welcome}</h1>
        <p>{t.lede}</p>
      </header>

      {currentPass && !completeness.isComplete && (
        <Link className="account-prompt" href="/account/details">
          <span className="account-prompt-icon" aria-hidden="true">
            <Icon name={completeness.isEmpty ? "user" : "alert"} />
          </span>
          <span className="account-prompt-main">
            <strong>
              {completeness.isEmpty
                ? t.prompt.empty
                : count(t.prompt.missing, completeness.total - completeness.filled)}
            </strong>
            <span>{t.prompt.body}</span>
          </span>
          <Icon name="arrowRight" />
        </Link>
      )}

      <section className="account-section">
        <div className="account-section-head">
          <h2>{t.currentPass.heading}</h2>
          {orders.length > 0 && (
            <span className="account-count">
              {count(t.currentPass.purchases, orders.length)}
            </span>
          )}
        </div>

        {currentPass ? (
          <>
            <article className={`account-pass-card tier-${currentPass.passKey}`}>
              <div className="account-pass-head">
                <span className="account-pass-badge">{t.currentPass.badge}</span>
                <span className="account-pass-invoice">{currentPass.invoiceNumber || "—"}</span>
              </div>

              <p className="account-pass-name">{passLabel(currentPass)}</p>
              {registrantNames(currentPass) && (
                <p className="account-pass-registrants">
                  {fill(t.currentPass.registered, { names: registrantNames(currentPass)! })}
                </p>
              )}

              <dl className="account-pass-facts">
                <div>
                  <dt>{t.currentPass.purchased}</dt>
                  <dd>{formatDate(currentPass.createdAt, lang)}</dd>
                </div>
                <div>
                  <dt>{t.currentPass.totalPaid}</dt>
                  <dd>{formatTotal(currentPass)}</dd>
                </div>
                {formatTrip(currentPass, lang) && (
                  <div className="account-pass-fact-wide">
                    <dt>{t.currentPass.tripDates}</dt>
                    <dd>{formatTrip(currentPass, lang)}</dd>
                  </div>
                )}
              </dl>

              <a
                className="account-pass-invoice-link"
                href={`/api/orders/${currentPass.sessionId}/invoice?format=pdf`}
              >
                <Icon name="receipt" />
                {t.currentPass.downloadInvoice}
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
                  <span>{count(t.stats.upcoming, upcoming.length)}</span>
                </span>
              </li>
              <li>
                <span className="account-stat-icon" aria-hidden="true">
                  <Icon name="compass" />
                </span>
                <span className="account-stat-main">
                  <strong>{unlocked.length}</strong>
                  <span>{count(t.stats.included, unlocked.length)}</span>
                </span>
              </li>
            </ul>
          </>
        ) : (
          <div className="account-empty">
            <span className="account-empty-icon" aria-hidden="true">
              <Icon name="ticket" />
            </span>
            <p>{t.currentPass.emptyTitle}</p>
            <Link className="button primary" href="/passes">
              {t.currentPass.browsePasses}
            </Link>
          </div>
        )}
      </section>

      {unlocked.length > 0 && (
        <section className="account-section">
          <div className="account-section-head">
            <h2>{t.experiences.heading}</h2>
            <Link className="account-section-link" href="/account/experiences">
              {t.experiences.seeAll}
              <Icon name="arrowRight" />
            </Link>
          </div>

          {nextBooking && (
            <Link className="xp-next" href="/account/bookings">
              <span className="xp-next-icon" aria-hidden="true">
                <Icon name="clock" />
              </span>
              <span className="xp-next-main">
                <span className="xp-next-label">{t.experiences.nextSession}</span>
                <strong>
                  {getLocalizedExperience(nextBooking.experienceKey, lang)?.name ??
                    nextBooking.experienceName}
                </strong>
                <span>
                  {formatDateLong(nextBooking.sessionDate, lang)} ·{" "}
                  {formatTimeRange(nextBooking.startMinutes, nextBooking.endMinutes, lang)} ·{" "}
                  {nextBooking.status === "confirmed"
                    ? t.experiences.confirmed
                    : t.experiences.awaiting}
                </span>
              </span>
              <Icon name="arrowRight" />
            </Link>
          )}

          <p className="account-section-lede">{t.experiences.lede}</p>

          <ul className="xp-mini-list">
            {unlocked.map(({ experience }) => (
              <li key={experience.key}>
                <Link href={`/account/experiences/${experience.key}`}>
                  <span className="xp-mini-icon" aria-hidden="true">
                    <Icon name={experience.icon} />
                  </span>
                  <span className="xp-mini-main">
                    <strong>{experience.name}</strong>
                    <span>{describeSchedule(experience, lang)}</span>
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
            <h2>{t.history.heading}</h2>
          </div>
          <ul className="account-history">
            {history.map((order) => {
              const tripDates = formatTrip(order, lang);

              return (
                <li key={order.sessionId} className="account-history-item">
                  <span
                    className={`account-history-swatch swatch-${order.passKey}`}
                    aria-hidden="true"
                  />
                  <div className="account-history-main">
                    <p className="account-history-name">{passLabel(order)}</p>
                    <p className="account-history-meta">
                      {formatDate(order.createdAt, lang)} · {formatTotal(order)}
                      {tripDates ? ` · ${fill(t.history.trip, { dates: tripDates })}` : ""}
                    </p>
                    {registrantNames(order) && (
                      <p className="account-history-meta">
                        {fill(t.currentPass.registered, { names: registrantNames(order)! })}
                      </p>
                    )}
                  </div>
                  <a
                    className="admin-icon-button"
                    href={`/api/orders/${order.sessionId}/invoice?format=pdf`}
                    title={fill(t.history.downloadInvoice, { number: order.invoiceNumber })}
                    aria-label={fill(t.history.downloadInvoice, { number: order.invoiceNumber })}
                  >
                    <Icon name="receipt" />
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="account-section">
        <div className="account-section-head">
          <h2>{t.manage.heading}</h2>
        </div>
        <div className="account-tiles">
          <Link className="account-tile" href="/account/details">
            <span className="account-tile-icon" aria-hidden="true">
              <Icon name="user" />
            </span>
            <strong>{t.manage.detailsTitle}</strong>
            <span>{t.manage.detailsBody}</span>
            <span className="account-tile-cue">
              {t.manage.detailsCue}
              <Icon name="arrowRight" />
            </span>
          </Link>

          <Link className="account-tile" href="/contact">
            <span className="account-tile-icon" aria-hidden="true">
              <Icon name="headset" />
            </span>
            <strong>{t.manage.helpTitle}</strong>
            <span>{t.manage.helpBody}</span>
            <span className="account-tile-cue">
              {t.manage.helpCue}
              <Icon name="arrowRight" />
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
