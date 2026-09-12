"use client";

import { useActionState, useMemo, useState } from "react";
import { createBooking, type BookingFormState } from "@/app/[lang]/account/booking-actions";
import { Icon } from "@/app/components/Icons";
import {
  BOOKING_LEAD_DAYS,
  CANCELLATION_CUTOFF_HOURS,
  formatPrice,
  formatTimeRange,
  getExperience,
  parseDate,
  PER_PERSON_PRICE_KEY,
  quoteBooking,
  type BookingWindow,
  type ExperienceSlot,
} from "@/app/data/experiences";

/** A catalogue slot annotated with how many of the 20 session spots are still open. */
export type BookableSlot = ExperienceSlot & { remaining: number };

export type PassOption = {
  sessionId: string;
  passKey: string;
  passName: string;
  discountPercent: number;
  /** "1 Sep 2026 – 10 Sep 2026", or null for passes bought before trip dates existed. */
  tripLabel: string | null;
  window: BookingWindow;
  slotsByDate: Record<string, BookableSlot[]>;
};

type BookingFormProps = {
  experienceKey: string;
  passOptions: PassOption[];
  defaultPassSessionId: string;
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

function monthLabel(month: string): string {
  return parseDate(`${month}-01`).toLocaleDateString("en-MY", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
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

const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * The whole booking flow on one screen: pick a pass (if there's a choice), a
 * date, a time, and who's coming — with the price updating as you go and a
 * single confirm at the end.
 *
 * Everything here is a convenience. The Server Action re-derives entitlement,
 * slot validity and the amount from the catalogue, so none of this state is
 * load-bearing for correctness.
 */
export default function BookingForm({
  experienceKey,
  passOptions,
  defaultPassSessionId,
}: BookingFormProps) {
  const experience = getExperience(experienceKey)!;

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

  const quote = quoteBooking(experience, pass.discountPercent, { participants, packageKey });

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
        quoteBooking(experience, pass.discountPercent, { participants, packageKey: key })
          .totalCents
      );

    return [
      {
        key: PER_PERSON_PRICE_KEY,
        label: "Per person",
        note: `Your ${pass.passName} Pass rate for each of the ${participants}`,
        price: totalFor(PER_PERSON_PRICE_KEY),
      },
      { key: pack.key, label: pack.label, note: pack.note, price: totalFor(pack.key) },
    ];
  }, [experience, pass.discountPercent, pass.passName, participants]);

  const canSubmit = Boolean(slot) && acknowledged && !pending;

  if (availableDates.length === 0) {
    return (
      <div className="xp-book-panel">
        <div className="account-inline-empty">
          <p>
            There are no {experience.name} sessions we can offer you right now
            {pass.tripLabel
              ? ` between ${pass.tripLabel} — bookings need ${BOOKING_LEAD_DAYS} days' notice.`
              : "."}
          </p>
          <a className="button ghost dark" href="/contact">
            Talk to our team
          </a>
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
          <legend>Book with</legend>
          <div className="xp-chip-row">
            {passOptions.map((option) => (
              <button
                key={option.sessionId}
                type="button"
                className={`xp-chip${option.sessionId === pass.sessionId ? " is-selected" : ""}`}
                onClick={() => choosePass(option)}
              >
                {option.passName} Pass
                {option.discountPercent > 0 && <small>{option.discountPercent}% off</small>}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="xp-field">
        <legend>Pick a date</legend>
        <p className="xp-field-hint">
          Only dates with a session are selectable.
          {pass.tripLabel && ` Limited to your trip: ${pass.tripLabel}.`}
        </p>

        <div className="xp-calendar">
          <div className="xp-calendar-head">
            <button
              type="button"
              className="xp-calendar-nav"
              onClick={() => setMonth(addMonths(month, -1))}
              disabled={month <= firstMonth}
              aria-label="Previous month"
            >
              ‹
            </button>
            <span>{monthLabel(month)}</span>
            <button
              type="button"
              className="xp-calendar-nav"
              onClick={() => setMonth(addMonths(month, 1))}
              disabled={month >= lastMonth}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="xp-calendar-grid" role="grid">
            {WEEKDAY_INITIALS.map((initial, index) => (
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
          <legend>Pick a time</legend>
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
                  {formatTimeRange(option.startMinutes, option.endMinutes)}
                  <small>{full ? "Full" : `${option.remaining} spot${option.remaining === 1 ? "" : "s"} left`}</small>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {experience.locationOptions && (
        <label className="admin-field xp-field">
          <span>Location</span>
          <select name="location" value={location} onChange={(e) => setLocation(e.target.value)}>
            {experience.locationOptions.map((option) => (
              <option key={option.value} value={option.value} disabled={option.comingSoon}>
                {option.label}
                {option.comingSoon ? " — coming soon" : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="xp-field">
        <legend>Who&apos;s coming</legend>

        <Stepper
          name="participants"
          label={experience.participants.label}
          hint={
            experience.pricing.mode === "group"
              ? `Group package covers up to ${experience.pricing.includedParticipants}`
              : undefined
          }
          value={participants}
          min={experience.participants.min}
          max={participantsMax}
          onChange={setRequestedParticipants}
        />

        {experience.freeChildAgeUnder && (
          <Stepper
            name="childrenCount"
            label={`Children under ${experience.freeChildAgeUnder}`}
            hint="Join free — not counted above"
            value={children}
            min={0}
            max={experience.participants.max}
            onChange={setChildren}
          />
        )}
      </fieldset>

      {priceChoices.length > 0 && (
        <fieldset className="xp-field">
          <legend>Choose your package</legend>
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
        <span>Anything we should know? (optional)</span>
        <textarea
          name="customerNotes"
          rows={3}
          maxLength={500}
          placeholder="Dietary needs, mobility requirements, a birthday to mark…"
        />
      </label>

      <div className="xp-summary">
        <p className="xp-summary-title">Your booking</p>
        <ul className="xp-summary-lines">
          {quote.lines.map((line) => (
            <li key={line.label}>
              <span>{line.label}</span>
              <span>{formatPrice(line.amountCents)}</span>
            </li>
          ))}
        </ul>
        <div className="xp-summary-total">
          <span>Payable at the venue</span>
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
            Your {pass.passName} Pass saves you {formatPrice(quote.savingsCents)} on this booking.
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
          I understand nothing is charged now — {formatPrice(quote.totalCents)} is payable at the
          venue on the day — and that I can cancel free of charge up to{" "}
          {CANCELLATION_CUTOFF_HOURS} hours before the session.
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
            Booking…
          </>
        ) : (
          <>
            Confirm booking
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
};

function Stepper({ name, label, hint, value, min, max, onChange }: StepperProps) {
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
          aria-label={`Fewer — ${label}`}
        >
          −
        </button>
        <output>{value}</output>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`More — ${label}`}
        >
          +
        </button>
      </span>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
