"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "@/i18n/Link";
import { createBooking, type BookingFormState } from "@/app/[lang]/account/booking-actions";
import { Icon } from "@/app/components/Icons";
import {
  BOOKING_LEAD_DAYS,
  CANCELLATION_CUTOFF_HOURS,
  formatPrice,
  formatTimeRange,
  getLocalizedExperience,
  packAvailable,
  parseDate,
  PER_PERSON_PRICE_KEY,
  quoteBooking,
  type BookingWindow,
  type ExperienceSlot,
} from "@/app/data/experiences";
import type { Dictionary } from "@/i18n/dictionaries";
import { htmlLang, type Locale } from "@/i18n/config";
import { count, fill } from "@/i18n/interpolate";

/** A catalogue slot annotated with how many of the 20 session spots are still open. */
export type BookableSlot = ExperienceSlot & { remaining: number };

export type PassOption = {
  sessionId: string;
  passKey: string;
  /** Already localized by the page — this component never re-derives it. */
  passName: string;
  discountPercent: number;
  /** "25% off" / "7.5折", shaped by `phrases` on the server. */
  discountLabel: string;
  /** "1 Sep 2026 – 10 Sep 2026", or null for passes bought before trip dates existed. */
  tripLabel: string | null;
  window: BookingWindow;
  slotsByDate: Record<string, BookableSlot[]>;
};

type BookingCopy = Dictionary["account"]["bookingForm"];

type BookingFormProps = {
  experienceKey: string;
  passOptions: PassOption[];
  defaultPassSessionId: string;
  t: BookingCopy;
  lang: Locale;
};

/* ---- Month arithmetic for the calendar, on "YYYY-MM" keys ---- */

function monthOf(date: string): string {
  return date.slice(0, 7);
}

function addMonths(month: string, delta: number): string {
  const [year, index] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, index - 1 + delta, 1));
  return shifted.toISOString().slice(0, 7);
}

function monthLabel(month: string, lang: Locale): string {
  return parseDate(`${month}-01`).toLocaleDateString(
    lang === "en" ? "en-MY" : htmlLang[lang],
    { timeZone: "UTC", month: "long", year: "numeric" }
  );
}

/** Every date in the month as "YYYY-MM-DD", plus the Monday-first leading blanks. */
function monthGrid(month: string): { blanks: number; dates: string[] } {
  const [year, index] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, index - 1, 1));
  const dayCount = new Date(Date.UTC(year, index, 0)).getUTCDate();

  const dates: string[] = [];
  for (let day = 1; day <= dayCount; day += 1) {
    dates.push(`${month}-${String(day).padStart(2, "0")}`);
  }

  // getUTCDay is Sunday-first; the grid is Monday-first.
  return { blanks: (first.getUTCDay() + 6) % 7, dates };
}

/**
 * The whole booking flow on one screen: pick a pass (if there's a choice), a
 * date, a time, and who's coming — with the price updating as you go and a
 * single confirm at the end.
 *
 * Everything here is a convenience. The Server Action re-derives entitlement,
 * slot validity and the amount from the catalogue, so none of this state is
 * load-bearing for correctness — including `lang`, which only decides words.
 */
export default function BookingForm({
  experienceKey,
  passOptions,
  defaultPassSessionId,
  t,
  lang,
}: BookingFormProps) {
  // Memoised because `getLocalizedExperience` builds a fresh object each call:
  // an unstable reference here would invalidate `priceChoices` on every render,
  // re-quoting the whole cart as the customer types in the notes field.
  const experience = useMemo(
    () => getLocalizedExperience(experienceKey, lang)!,
    [experienceKey, lang]
  );

  const [state, formAction, pending] = useActionState<BookingFormState, FormData>(createBooking, {
    error: null,
  });

  const [passSessionId, setPassSessionId] = useState(defaultPassSessionId);
  const pass = passOptions.find((o) => o.sessionId === passSessionId) ?? passOptions[0];

  const availableDates = useMemo(
    () => Object.keys(pass.slotsByDate).sort(),
    [pass.slotsByDate]
  );

  const [month, setMonth] = useState(() => monthOf(availableDates[0] ?? pass.window.earliest));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  const [requestedParticipants, setRequestedParticipants] = useState(experience.participants.min);
  const [children, setChildren] = useState(0);
  const [packageKey, setPackageKey] = useState(() => {
    if (experience.pricing.mode === "packages") return experience.pricing.options[0].key;
    // A group pack is opt-in: the per-person rate is what's selected to start with.
    return experience.pricing.mode === "per-person" && experience.pricing.groupPack
      ? PER_PERSON_PRICE_KEY
      : "";
  });
  const [location, setLocation] = useState(
    experience.locationOptions?.find((o) => !o.comingSoon)?.value ?? ""
  );
  const [acknowledged, setAcknowledged] = useState(false);

  /** Switching pass changes the bookable window, so any prior date choice is void. */
  function choosePass(option: PassOption) {
    setPassSessionId(option.sessionId);
    setSelectedDate(null);
    setSlot(null);
    setMonth(monthOf(Object.keys(option.slotsByDate).sort()[0] ?? option.window.earliest));
  }

  const firstMonth = monthOf(availableDates[0] ?? pass.window.earliest);
  const lastMonth = monthOf(availableDates.at(-1) ?? pass.window.latest);
  const grid = monthGrid(month);
  const daySlots = selectedDate ? (pass.slotsByDate[selectedDate] ?? []) : [];
  const selectedSlotRemaining = daySlots.find((option) => option.value === slot)?.remaining;
  const participantsMax =
    selectedSlotRemaining !== undefined
      ? Math.min(experience.participants.max, selectedSlotRemaining)
      : experience.participants.max;

  // A slot with fewer spots left than the headcount already dialled in must
  // pull that count back down — otherwise the stepper would let the customer
  // submit more people than the session has room for. Clamping on read keeps
  // the requested figure intact, so picking a roomier slot restores it.
  const participants = Math.min(requestedParticipants, participantsMax);

  const quote = quoteBooking(
    experience,
    pass.discountPercent,
    { participants, packageKey },
    lang
  );

  /**
   * The priced choices on offer: the fixed packages, or — where an experience
   * pairs a per-person rate with a group pack — the two ways to price this
   * headcount, each shown at what it would actually come to. Empty when there's
   * nothing to choose and the fieldset is left out entirely.
   */
  const priceChoices = useMemo(() => {
    if (experience.pricing.mode === "packages") {
      return experience.pricing.options.map((option) => ({
        key: option.key,
        label: option.label,
        note: option.note,
        price: formatPrice(option.priceCents),
      }));
    }

    if (experience.pricing.mode !== "per-person" || !experience.pricing.groupPack) return [];

    const pack = experience.pricing.groupPack;
    const totalFor = (key: string) =>
      formatPrice(
        quoteBooking(experience, pass.discountPercent, { participants, packageKey: key }, lang)
          .totalCents
      );

    const perPerson = {
      key: PER_PERSON_PRICE_KEY,
      label: t.perPerson,
      note: fill(t.perPersonNote, { pass: pass.passName, n: participants }),
      price: totalFor(PER_PERSON_PRICE_KEY),
    };

    // Below its minimum the pack is not an option at all, so offering it as a
    // greyed-out row would only invite the question of why.
    if (!packAvailable(pack, participants)) return [perPerson];

    return [
      perPerson,
      { key: pack.key, label: pack.label, note: pack.note, price: totalFor(pack.key) },
    ];
  }, [experience, pass.discountPercent, pass.passName, participants, t, lang]);

  const canSubmit = Boolean(slot) && acknowledged && !pending;

  if (availableDates.length === 0) {
    return (
      <div className="xp-book-panel">
        <div className="account-inline-empty">
          <p>
            {pass.tripLabel
              ? fill(t.noSessionsInTrip, {
                  experience: experience.name,
                  trip: pass.tripLabel,
                  days: BOOKING_LEAD_DAYS,
                })
              : fill(t.noSessions, { experience: experience.name })}
          </p>
          <Link className="button ghost dark" href="/contact">
            {t.talkToUs}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="xp-book-panel" action={formAction}>
      <input type="hidden" name="experienceKey" value={experience.key} />
      <input type="hidden" name="orderSessionId" value={pass.sessionId} />
      <input type="hidden" name="slot" value={slot ?? ""} />

      {passOptions.length > 1 && (
        <fieldset className="xp-field">
          <legend>{t.bookWith}</legend>
          <div className="xp-chip-row">
            {passOptions.map((option) => (
              <button
                key={option.sessionId}
                type="button"
                className={`xp-chip${option.sessionId === pass.sessionId ? " is-selected" : ""}`}
                onClick={() => choosePass(option)}
              >
                {fill(t.passChip, { pass: option.passName })}
                {option.discountPercent > 0 && <small>{option.discountLabel}</small>}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="xp-field">
        <legend>{t.pickDate}</legend>
        <p className="xp-field-hint">
          {t.onlyAvailable}
          {pass.tripLabel && fill(t.limitedToTrip, { trip: pass.tripLabel })}
        </p>

        <div className="xp-calendar">
          <div className="xp-calendar-head">
            <button
              type="button"
              className="xp-calendar-nav"
              onClick={() => setMonth(addMonths(month, -1))}
              disabled={month <= firstMonth}
              aria-label={t.previousMonth}
            >
              ‹
            </button>
            <span>{monthLabel(month, lang)}</span>
            <button
              type="button"
              className="xp-calendar-nav"
              onClick={() => setMonth(addMonths(month, 1))}
              disabled={month >= lastMonth}
              aria-label={t.nextMonth}
            >
              ›
            </button>
          </div>

          <div className="xp-calendar-grid" role="grid">
            {t.weekdayInitials.map((initial, index) => (
              <span key={index} className="xp-calendar-weekday" aria-hidden="true">
                {initial}
              </span>
            ))}

            {Array.from({ length: grid.blanks }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}

            {grid.dates.map((date) => {
              const slotsThatDay = pass.slotsByDate[date] ?? [];
              const available = slotsThatDay.some((slot) => slot.remaining > 0);
              const openSlots = slotsThatDay.filter((slot) => slot.remaining > 0);

              return (
                <button
                  key={date}
                  type="button"
                  className={`xp-calendar-day${date === selectedDate ? " is-selected" : ""}${
                    available ? " is-available" : ""
                  }`}
                  disabled={!available}
                  aria-pressed={date === selectedDate}
                  onClick={() => {
                    setSelectedDate(date);
                    // One open session that day? Choosing the date is choosing it.
                    setSlot(openSlots.length === 1 ? openSlots[0].value : null);
                  }}
                >
                  {Number(date.slice(8))}
                </button>
              );
            })}
          </div>
        </div>
      </fieldset>

      {selectedDate && (
        <fieldset className="xp-field">
          <legend>{t.pickTime}</legend>
          <div className="xp-chip-row">
            {daySlots.map((option) => {
              const full = option.remaining <= 0;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`xp-chip${option.value === slot ? " is-selected" : ""}`}
                  disabled={full}
                  onClick={() => setSlot(option.value)}
                >
                  {formatTimeRange(option.startMinutes, option.endMinutes, lang)}
                  <small>{full ? t.full : count(t.spotsLeft, option.remaining)}</small>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {experience.locationOptions && (
        <label className="admin-field xp-field">
          <span>{t.location}</span>
          <select name="location" value={location} onChange={(e) => setLocation(e.target.value)}>
            {experience.locationOptions.map((option) => (
              <option key={option.value} value={option.value} disabled={option.comingSoon}>
                {option.label}
                {option.comingSoon ? t.comingSoon : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="xp-field">
        <legend>{t.whosComing}</legend>

        <Stepper
          name="participants"
          label={experience.participants.label}
          hint={
            experience.pricing.mode === "group"
              ? fill(t.groupCovers, { n: experience.pricing.includedParticipants })
              : undefined
          }
          value={participants}
          min={experience.participants.min}
          max={participantsMax}
          onChange={setRequestedParticipants}
          t={t}
        />

        {experience.freeChildAgeUnder && (
          <Stepper
            name="childrenCount"
            label={fill(t.childrenUnder, { age: experience.freeChildAgeUnder })}
            hint={t.childrenFree}
            value={children}
            min={0}
            max={experience.participants.max}
            onChange={setChildren}
            t={t}
          />
        )}
      </fieldset>

      {priceChoices.length > 0 && (
        <fieldset className="xp-field">
          <legend>{t.choosePackage}</legend>
          <div className="xp-option-list">
            {priceChoices.map((choice) => (
              <label
                key={choice.key}
                className={`xp-option${choice.key === packageKey ? " is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="packageKey"
                  value={choice.key}
                  checked={choice.key === packageKey}
                  onChange={() => setPackageKey(choice.key)}
                />
                <span className="xp-option-main">
                  <strong>{choice.label}</strong>
                  {choice.note && <small>{choice.note}</small>}
                </span>
                <span className="xp-option-price">{choice.price}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="admin-field xp-field">
        <span>{t.notes}</span>
        <textarea
          name="customerNotes"
          rows={3}
          maxLength={500}
          placeholder={t.notesPlaceholder}
        />
      </label>

      <div className="xp-summary">
        <p className="xp-summary-title">{t.summary}</p>
        <ul className="xp-summary-lines">
          {quote.lines.map((line) => (
            <li key={line.label}>
              <span>{line.label}</span>
              <span>{formatPrice(line.amountCents)}</span>
            </li>
          ))}
        </ul>
        <div className="xp-summary-total">
          <span>{t.payableAtVenue}</span>
          <span className="xp-summary-total-amounts">
            {quote.savingsCents > 0 && (
              <span className="xp-summary-was">{formatPrice(quote.regularTotalCents)}</span>
            )}
            <strong>{formatPrice(quote.totalCents)}</strong>
          </span>
        </div>
        {quote.savingsCents > 0 && (
          <p className="xp-summary-saving">
            <Icon name="bolt" />
            {fill(t.saving, {
              pass: pass.passName,
              amount: formatPrice(quote.savingsCents),
            })}
          </p>
        )}
      </div>

      <label className="register-consent">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />
        <span>
          {fill(t.consent, {
            amount: formatPrice(quote.totalCents),
            hours: CANCELLATION_CUTOFF_HOURS,
          })}
        </span>
      </label>

      {state.error && (
        <p className="checkout-error" role="alert">
          {state.error}
        </p>
      )}

      <button className="button primary xp-submit" type="submit" disabled={!canSubmit} aria-busy={pending}>
        {pending ? (
          <>
            <span className="checkout-spinner" aria-hidden="true" />
            {t.submitting}
          </>
        ) : (
          <>
            {t.submit}
            <Icon name="arrowRight" />
          </>
        )}
      </button>
    </form>
  );
}

type StepperProps = {
  name: string;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  t: BookingCopy;
};

function Stepper({ name, label, hint, value, min, max, onChange, t }: StepperProps) {
  return (
    <div className="xp-stepper">
      <span className="xp-stepper-label">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <span className="xp-stepper-controls">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={fill(t.fewer, { label })}
        >
          −
        </button>
        <output>{value}</output>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={fill(t.more, { label })}
        >
          +
        </button>
      </span>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
