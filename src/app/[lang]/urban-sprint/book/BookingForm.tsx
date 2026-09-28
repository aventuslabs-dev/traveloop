"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ARRIVAL_LEAD_MINUTES,
  HOLD_MINUTES,
  SLOT_CAPACITY,
  TEAM_PRICE_CENTS,
  TEAM_SIZE_MAX,
  TEAM_SIZE_MIN,
  arrivalTime,
  dateParts,
  formatBookingDate,
  formatRinggit,
  formatSlotTime,
} from "@/lib/urban-sprint/booking-config";
import {
  BOOKING_NATIONALITIES,
  BOOKING_RELATIONSHIPS,
  DOCUMENT_TYPE_LABEL,
  MAX_AGE,
  MIN_AGE,
  SEX_LABEL,
  emptyParticipant,
  validateBooking,
  type BookingErrors,
  type DocumentType,
  type ParticipantDraft,
} from "@/lib/urban-sprint/booking-form";
import type { DayAvailability, SlotAvailability } from "@/lib/urban-sprint/bookings-db";
import InsuranceTerms from "@/app/components/InsuranceTerms";
import type { InsuranceDoc } from "@/i18n/legal";
import LinkedText from "../_components/LinkedText";

/**
 * The team booking form. One page, four steps, and a summary that follows the
 * buyer down the screen with the pay button in it.
 *
 * Every racer gets a Traveloop Platinum Pass with the team, so each person's
 * card also takes the pass's insurance registration — the same details, and
 * the same terms, as buying a pass on /passes/register.
 *
 * Everything here is advisory: the route re-validates, and the database has
 * the final word on whether a place is still free. What this component owes
 * the buyer is not being surprised by that — sold-out slots are disabled
 * before they're picked, and a slot that fills while they type is reported
 * against the slot, with the calendar refreshed so they can pick again.
 */

/**
 * Where the form is parked while the buyer is on Stripe's page, so pressing
 * Back there doesn't cost them six people's details. Session storage, not
 * local: it holds identity numbers, and should go when the tab does.
 */
const DRAFT_KEY = "us-booking-draft";

const SIZES = Array.from(
  { length: TEAM_SIZE_MAX - TEAM_SIZE_MIN + 1 },
  (_, index) => TEAM_SIZE_MIN + index
);

type SavedDraft = {
  date: string;
  time: string;
  teamName: string;
  teamSize: number;
  participants: ParticipantDraft[];
};

function readSavedDraft(): SavedDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    const saved = raw ? (JSON.parse(raw) as SavedDraft) : null;
    if (!saved || !Array.isArray(saved.participants)) return null;
    // A draft parked by an older version of this form lacks the newer fields.
    return {
      ...saved,
      participants: saved.participants.map((participant) => ({ ...emptyParticipant(), ...participant })),
    };
  } catch {
    return null;
  }
}

function slotAvailable(slot: SlotAvailability): boolean {
  return slot.open && slot.remaining > 0;
}

/** Why a day can't be picked, or null when it can. */
function dayBlocker(day: DayAvailability): "Full" | "Closed" | null {
  if (day.slots.some(slotAvailable)) return null;
  // Past every cutoff reads differently from sold out: nobody took the
  // places, the day just ran out.
  return day.slots.some((slot) => slot.open) ? "Full" : "Closed";
}

function slotNote(slot: SlotAvailability): string {
  if (!slot.open) return "Closed";
  if (slot.remaining === 0) return "Sold out";
  return slot.remaining === 1 ? "1 place left" : `${slot.remaining} places left`;
}

/** Field keys become element ids so the first error can be scrolled to. */
function fieldId(key: string): string {
  return `us-book-${key.replace(/\./g, "-")}`;
}

/** A field's error message, said against the field. */
function fieldError(errors: BookingErrors, key: string): React.ReactNode {
  return errors[key] ? (
    <small className="us-field-error" id={`${fieldId(key)}-error`}>
      {errors[key]}
    </small>
  ) : null;
}

/** The aria attributes that tie an invalid field to its message. */
function invalidProps(errors: BookingErrors, key: string) {
  return errors[key]
    ? { "aria-invalid": true as const, "aria-describedby": `${fieldId(key)}-error` }
    : {};
}

export default function BookingForm({
  availability,
  cancelledReference,
  consentText,
  consentVersion,
  rulesText,
  insurance,
  passConsentText,
}: {
  availability: DayAvailability[];
  /** The declaration, from the console. Its version goes back with the booking. */
  consentText: string;
  consentVersion: string;
  rulesText: string;
  /** The Traveloop insurance terms every Platinum Pass is sold under. */
  insurance: InsuranceDoc;
  /** The pass buyer's declaration from /passes/register, word for word. */
  passConsentText: string;
  /** Set when the buyer has come back from Stripe without paying. */
  cancelledReference: string | null;
}) {
  const router = useRouter();

  const firstBookableDate = availability.find((day) => !dayBlocker(day))?.date ?? "";

  const [date, setDate] = useState(firstBookableDate);
  const [time, setTime] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamSize, setTeamSize] = useState(TEAM_SIZE_MIN);
  // Always six drafts, so shrinking the team and growing it back doesn't
  // throw away what was typed for the people in between. Trip dates start on
  // the pre-picked race day.
  const [participants, setParticipants] = useState<ParticipantDraft[]>(() =>
    Array.from({ length: TEAM_SIZE_MAX }, () => ({
      ...emptyParticipant(),
      arrivalDate: firstBookableDate,
      departureDate: firstBookableDate,
    }))
  );
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [passTermsAccepted, setPassTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<BookingErrors>({});
  const [banner, setBanner] = useState<{ tone: "err" | "info"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handledCancel = useRef(false);

  // Back from Stripe without paying: give the place back first (it's still
  // held for this buyer, and may be the very place they want), then put
  // their details back in the form.
  useEffect(() => {
    if (!cancelledReference || handledCancel.current) return;
    handledCancel.current = true;

    fetch("/api/urban-sprint/bookings/release", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reference: cancelledReference }),
    })
      .catch(() => undefined)
      .finally(() => {
        const saved = readSavedDraft();
        if (saved) {
          setDate(saved.date);
          setTime(saved.time);
          setTeamName(saved.teamName);
          setTeamSize(saved.teamSize);
          setParticipants(saved.participants);
        }

        setBanner({
          tone: "info",
          text: saved
            ? "Payment cancelled — nothing was charged. Your details are still here."
            : "Payment cancelled — nothing was charged.",
        });

        // Drop ?cancelled so a reload doesn't repeat this, then re-read
        // availability with the released place counted back in.
        window.history.replaceState(null, "", window.location.pathname);
        router.refresh();
      });
  }, [cancelledReference, router]);

  const selectedDay = availability.find((day) => day.date === date) ?? null;
  const selectedSlot = selectedDay?.slots.find((slot) => slot.time === time) ?? null;
  const slotStillAvailable = selectedSlot ? slotAvailable(selectedSlot) : false;

  const activeParticipants = useMemo(
    () => participants.slice(0, teamSize),
    [participants, teamSize]
  );

  // Stable, so the racer cards (memoised below) don't all re-render on every
  // keystroke in one of them.
  const clearError = useCallback((...keys: string[]) => {
    setErrors((current) => {
      if (!keys.some((key) => key in current)) return current;
      const next = { ...current };
      for (const key of keys) delete next[key];
      return next;
    });
  }, []);

  function pickDate(value: string) {
    // Most racers are in town for the day, so trip dates follow the race day
    // until someone types their own.
    setParticipants((current) =>
      current.map((participant) => ({
        ...participant,
        arrivalDate:
          !participant.arrivalDate || participant.arrivalDate === date ? value : participant.arrivalDate,
        departureDate:
          !participant.departureDate || participant.departureDate === date
            ? value
            : participant.departureDate,
      }))
    );
    setDate(value);
    setTime("");
    clearError("slot");
  }

  function pickTime(value: string) {
    setTime(value);
    clearError("slot");
  }

  const updateParticipant = useCallback(
    (index: number, patch: Partial<ParticipantDraft>) => {
      setParticipants((current) =>
        current.map((participant, i) => (i === index ? { ...participant, ...patch } : participant))
      );
      clearError(...Object.keys(patch).map((field) => `p${index}.${field}`));
    },
    [clearError]
  );

  function showErrors(next: BookingErrors) {
    setErrors(next);
    setBanner({
      tone: "err",
      text:
        Object.keys(next).length === 1
          ? Object.values(next)[0]
          : "A few details need fixing — they're highlighted below.",
    });

    const first = Object.keys(next)[0];
    // After React has painted the error states, so the scroll lands on them.
    requestAnimationFrame(() => {
      const target = document.getElementById(fieldId(first));
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
        target.focus({ preventScroll: true });
      }
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const draft = {
      date,
      time: slotStillAvailable ? time : "",
      teamName,
      participants: activeParticipants,
      termsAccepted,
      passTermsAccepted,
    };

    const checked = validateBooking(draft);
    if (!checked.ok) {
      showErrors(checked.errors);
      return;
    }

    setSubmitting(true);
    setBanner(null);

    try {
      const response = await fetch("/api/urban-sprint/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, consentVersion }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
        errors?: BookingErrors;
        code?: string;
      };

      if (!response.ok || !data.url) {
        if (data.code === "slot_full") {
          setTime("");
          router.refresh();
        }
        // The wording changed in the console: fetch the new text into the
        // form and make the buyer tick it afresh.
        if (data.code === "terms_changed") {
          setTermsAccepted(false);
          router.refresh();
        }
        if (data.errors) showErrors(data.errors);
        else setBanner({ tone: "err", text: data.error ?? "Something went wrong. Please try again." });
        setSubmitting(false);
        return;
      }

      try {
        const saved: SavedDraft = { date, time, teamName, teamSize, participants };
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(saved));
      } catch {
        // Private mode or storage full: the booking still works, the buyer
        // just retypes if they come back from Stripe.
      }

      // Left in the submitting state on purpose: the page is navigating away.
      window.location.assign(data.url);
    } catch {
      setBanner({ tone: "err", text: "We couldn't reach the server. Check your connection and try again." });
      setSubmitting(false);
    }
  }

  const error = (key: string) => fieldError(errors, key);
  const invalid = (key: string) => invalidProps(errors, key);

  const bookableDays = availability.filter((day) => !dayBlocker(day)).length;

  // The long, fixed texts in the summary. As elements made once, React skips
  // them on every keystroke instead of re-rendering the whole insurance
  // contract each time a name is typed.
  const rulesDoc = useMemo(() => <LinkedText text={rulesText} />, [rulesText]);
  const consentDoc = useMemo(() => <LinkedText text={consentText} />, [consentText]);
  const insuranceDoc = useMemo(() => <InsuranceTerms dict={insurance} />, [insurance]);

  // The phone pay bar steps aside while the summary is on screen.
  const summary = useRef<HTMLElement>(null);
  const [summaryInView, setSummaryInView] = useState(false);
  useEffect(() => {
    const el = summary.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setSummaryInView(entry.isIntersecting), {
      threshold: 0.15,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <form className="us-book-layout" onSubmit={submit} noValidate>
      <div className="us-book-main">
        {banner && (
          <p className={`us-flash us-flash-${banner.tone}`} role={banner.tone === "err" ? "alert" : "status"}>
            {banner.text}
          </p>
        )}

        {/* ------------------------------ 1. Slot ------------------------------ */}
        <section className="us-book-section" aria-labelledby="us-book-step-slot">
          <header className="us-book-step">
            <span className="us-book-stepnum">1</span>
            <div>
              <h2 id="us-book-step-slot">Pick a date and start time</h2>
              <p>
                Races start five times a day. Each slot takes {SLOT_CAPACITY} teams. Arrive{" "}
                {ARRIVAL_LEAD_MINUTES} minutes before your challenge time to check in.
              </p>
            </div>
          </header>

          {bookableDays === 0 ? (
            <p className="us-panel-empty">Every slot in the calendar is taken. Check back soon.</p>
          ) : (
            <>
              <div className="us-datestrip" role="radiogroup" aria-label="Race date" id={fieldId("slot")}>
                {availability.map((day) => {
                  const blocker = dayBlocker(day);
                  const parts = dateParts(day.date);
                  const active = day.date === date;

                  return (
                    <button
                      key={day.date}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={`${formatBookingDate(day.date)}${blocker ? ` — ${blocker}` : ""}`}
                      className={`us-datechip${active ? " is-active" : ""}`}
                      disabled={!!blocker}
                      onClick={() => pickDate(day.date)}
                    >
                      <span className="us-datechip-dow">{parts.weekday}</span>
                      <span className="us-datechip-day">{parts.day}</span>
                      <span className="us-datechip-month">{blocker ?? parts.month}</span>
                    </button>
                  );
                })}
              </div>

              {selectedDay && (
                <div className="us-slotgrid" role="radiogroup" aria-label={`Start times on ${formatBookingDate(selectedDay.date)}`}>
                  {selectedDay.slots.map((slot) => {
                    const available = slotAvailable(slot);
                    const active = slot.time === time && available;

                    return (
                      <button
                        key={slot.time}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`us-slot${active ? " is-active" : ""}${
                          available && slot.remaining <= 2 ? " is-low" : ""
                        }`}
                        disabled={!available}
                        onClick={() => pickTime(slot.time)}
                      >
                        <b>{formatSlotTime(slot.time)}</b>
                        <span>{slotNote(slot)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
          {error("slot")}
        </section>

        {/* ------------------------------ 2. Team ------------------------------ */}
        <section className="us-book-section" aria-labelledby="us-book-step-team">
          <header className="us-book-step">
            <span className="us-book-stepnum">2</span>
            <div>
              <h2 id="us-book-step-team">Your team</h2>
              <p>
                {formatRinggit(TEAM_PRICE_CENTS)} per team, whatever its size, with a Traveloop
                Platinum Pass for every racer. Nobody needs to be team leader — everyone registers
                the same way.
              </p>
            </div>
          </header>

          <div className="us-form-grid">
            <label className={`us-field${errors.teamName ? " has-error" : ""}`}>
              <span>Team name</span>
              <input
                id={fieldId("teamName")}
                value={teamName}
                maxLength={40}
                placeholder="The Night Owls"
                autoComplete="off"
                onChange={(event) => {
                  setTeamName(event.target.value);
                  clearError("teamName");
                }}
                {...invalid("teamName")}
              />
              {error("teamName")}
            </label>

            <div className="us-field">
              <span id="us-book-size-label">Team size</span>
              <div className="us-segment" role="radiogroup" aria-labelledby="us-book-size-label" id={fieldId("teamSize")}>
                {SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    role="radio"
                    aria-checked={teamSize === size}
                    className={`us-segment-btn${teamSize === size ? " is-active" : ""}`}
                    onClick={() => {
                      setTeamSize(size);
                      clearError("teamSize");
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {error("teamSize")}
            </div>
          </div>
        </section>

        {/* --------------------------- 3. Participants -------------------------- */}
        <section className="us-book-section" aria-labelledby="us-book-step-people">
          <header className="us-book-step">
            <span className="us-book-stepnum">3</span>
            <div>
              <h2 id="us-book-step-people">Who&rsquo;s racing</h2>
              <p>
                Enter each person exactly as their IC or passport shows it. These details are used
                for their Traveloop Platinum Pass and its insurance cover, which runs for their
                trip — so it has to include race day.
              </p>
            </div>
          </header>

          <div className="us-people">
            {activeParticipants.map((participant, index) => (
              <ParticipantCard
                key={index}
                index={index}
                participant={participant}
                errors={errors}
                onChange={updateParticipant}
              />
            ))}
          </div>
        </section>
      </div>

      {/* ------------------------- 4. Summary + consent ------------------------ */}
      <aside className="us-summary" ref={summary} aria-labelledby="us-book-step-pay">
        <header className="us-book-step">
          <span className="us-book-stepnum">4</span>
          <div>
            <h2 id="us-book-step-pay">Confirm and pay</h2>
          </div>
        </header>

        <dl className="us-summary-list">
          <div>
            <dt>Date</dt>
            <dd>{date ? formatBookingDate(date) : "—"}</dd>
          </div>
          <div>
            <dt>Challenge time</dt>
            <dd>{time && slotStillAvailable ? formatSlotTime(time) : "Pick a slot"}</dd>
          </div>
          {time && slotStillAvailable && (
            <div>
              <dt>Arrive by</dt>
              <dd>{formatSlotTime(arrivalTime(time))}</dd>
            </div>
          )}
          <div>
            <dt>Team</dt>
            <dd>{teamName.trim() || "—"}</dd>
          </div>
          <div>
            <dt>Team size</dt>
            <dd>{teamSize} people</dd>
          </div>
          <div>
            <dt>Included</dt>
            <dd>{teamSize} × Platinum Pass</dd>
          </div>
          <div className="is-total">
            <dt>Total</dt>
            <dd>{formatRinggit(TEAM_PRICE_CENTS)}</dd>
          </div>
        </dl>

        {/* Rules and declaration both come from the console (Overview >
            Booking wording), because Traveloop is still finalising them. */}
        <details className="us-rules">
          <summary>Rules &amp; Regulations</summary>
          <div className="us-rules-body">{rulesDoc}</div>
        </details>

        <label className={`us-terms${errors.terms ? " has-error" : ""}`}>
          <input
            id={fieldId("terms")}
            type="checkbox"
            checked={termsAccepted}
            onChange={(event) => {
              setTermsAccepted(event.target.checked);
              clearError("terms");
            }}
            {...invalid("terms")}
          />
          <span>{consentDoc}</span>
        </label>
        {error("terms")}

        {/* The same contract and declaration a pass buyer accepts on
            /passes/register, because every racer is getting a pass. */}
        <details className="us-rules">
          <summary>Platinum Pass &amp; insurance terms</summary>
          <div className="us-rules-body is-doc">{insuranceDoc}</div>
        </details>

        <label className={`us-terms${errors.passTerms ? " has-error" : ""}`}>
          <input
            id={fieldId("passTerms")}
            type="checkbox"
            checked={passTermsAccepted}
            onChange={(event) => {
              setPassTermsAccepted(event.target.checked);
              clearError("passTerms");
            }}
            {...invalid("passTerms")}
          />
          <span>{passConsentText}</span>
        </label>
        {error("passTerms")}

        <button className="us-btn us-btn-primary us-btn-block us-btn-lg" type="submit" disabled={submitting}>
          {submitting ? "Reserving your slot…" : `Continue to payment · ${formatRinggit(TEAM_PRICE_CENTS)}`}
        </button>

        <p className="us-form-note">
          Your place is held for {HOLD_MINUTES} minutes while you pay on Stripe&rsquo;s secure
          checkout. Whoever pays gets one email with the Booking ID, every racer&rsquo;s pass
          number and the invoice, and a Traveloop account to find them in.
        </p>
      </aside>

      {/* Phones: the total and a way to the pay button, always in reach. */}
      <div className={`us-paybar${summaryInView ? " is-hidden" : ""}`} aria-hidden={summaryInView}>
        <p className="us-paybar-total">
          <b>{formatRinggit(TEAM_PRICE_CENTS)}</b>
          {teamSize} racers · Platinum Pass each
        </p>
        <button
          type="button"
          className="us-btn us-btn-primary"
          tabIndex={summaryInView ? -1 : undefined}
          onClick={() => summary.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          Review &amp; pay
        </button>
      </div>
    </form>
  );
}

/**
 * One racer's details. Memoised: typing in one card re-renders that card
 * alone, not all six, which a mid-range phone feels on every keystroke.
 */
const ParticipantCard = memo(function ParticipantCard({
  index,
  participant,
  errors,
  onChange: update,
}: {
  index: number;
  participant: ParticipantDraft;
  errors: BookingErrors;
  onChange: (index: number, patch: Partial<ParticipantDraft>) => void;
}) {
  const onChange = (patch: Partial<ParticipantDraft>) => update(index, patch);
  const error = (field: string) => fieldError(errors, field);
  const invalid = (field: string) => invalidProps(errors, field);
  const key = (field: string) => `p${index}.${field}`;
  const has = (field: string) => (errors[key(field)] ? " has-error" : "");
  // The buyer is most likely participant 1; letting the browser autofill the
  // others would stamp the buyer's own details onto everyone.
  const auto = (value: string) => (index === 0 ? value : "off");
  const isPassport = participant.documentType === "passport";

  return (
    <fieldset className="us-person">
      <legend className="us-person-head">
        <span className="us-person-num">{index + 1}</span>
        <span>{participant.fullName.trim() || `Participant ${index + 1}`}</span>
      </legend>

      <div className="us-form-grid">
        <label className={`us-field us-field-wide${has("fullName")}`}>
          <span>Full name (as on IC / passport)</span>
          <input
            id={fieldId(key("fullName"))}
            value={participant.fullName}
            autoComplete={auto("name")}
            onChange={(event) => onChange({ fullName: event.target.value })}
            {...invalid(key("fullName"))}
          />
          {error(key("fullName"))}
        </label>

        <div className={`us-field${has("documentType")}`}>
          <span id={`${fieldId(key("documentType"))}-label`}>Identity document</span>
          <div
            className="us-segment"
            role="radiogroup"
            aria-labelledby={`${fieldId(key("documentType"))}-label`}
            id={fieldId(key("documentType"))}
          >
            {(Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[]).map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={participant.documentType === type}
                className={`us-segment-btn${participant.documentType === type ? " is-active" : ""}`}
                onClick={() => onChange({ documentType: type, documentNumber: "" })}
              >
                {type === "mykad" ? "MyKad" : "Passport"}
              </button>
            ))}
          </div>
          {error(key("documentType"))}
        </div>

        <label className={`us-field${has("documentNumber")}`}>
          <span>{isPassport ? "Passport number" : "IC number"}</span>
          <input
            id={fieldId(key("documentNumber"))}
            value={participant.documentNumber}
            inputMode={isPassport ? "text" : "numeric"}
            autoCapitalize={isPassport ? "characters" : "off"}
            autoComplete="off"
            placeholder={isPassport ? "A12345678" : "900101-14-5678"}
            onChange={(event) => onChange({ documentNumber: event.target.value })}
            {...invalid(key("documentNumber"))}
          />
          {error(key("documentNumber"))}
        </label>

        {isPassport && (
          <label className={`us-field${has("nationality")}`}>
            <span>Nationality</span>
            <select
              id={fieldId(key("nationality"))}
              value={participant.nationality}
              onChange={(event) => onChange({ nationality: event.target.value, nationalityOther: "" })}
              {...invalid(key("nationality"))}
            >
              <option value="">Choose…</option>
              {BOOKING_NATIONALITIES.map((nationality) => (
                <option key={nationality} value={nationality}>
                  {nationality}
                </option>
              ))}
            </select>
            {error(key("nationality"))}
          </label>
        )}

        {isPassport && participant.nationality === "Other" && (
          <label className={`us-field${has("nationalityOther")}`}>
            <span>Nationality (other)</span>
            <input
              id={fieldId(key("nationalityOther"))}
              value={participant.nationalityOther}
              autoComplete="off"
              onChange={(event) => onChange({ nationalityOther: event.target.value })}
              {...invalid(key("nationalityOther"))}
            />
            {error(key("nationalityOther"))}
          </label>
        )}

        <label className={`us-field${has("sex")}`}>
          <span>Sex</span>
          <select
            id={fieldId(key("sex"))}
            value={participant.sex}
            onChange={(event) => onChange({ sex: event.target.value as ParticipantDraft["sex"] })}
            {...invalid(key("sex"))}
          >
            <option value="">Choose…</option>
            {Object.entries(SEX_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {error(key("sex"))}
        </label>

        <label className={`us-field${has("age")}`}>
          <span>Age</span>
          <input
            id={fieldId(key("age"))}
            value={participant.age}
            type="number"
            inputMode="numeric"
            min={MIN_AGE}
            max={MAX_AGE}
            autoComplete="off"
            onChange={(event) => onChange({ age: event.target.value })}
            {...invalid(key("age"))}
          />
          {error(key("age"))}
        </label>

        <label className={`us-field${has("email")}`}>
          <span>Email</span>
          <input
            id={fieldId(key("email"))}
            value={participant.email}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete={auto("email")}
            onChange={(event) => onChange({ email: event.target.value })}
            {...invalid(key("email"))}
          />
          {error(key("email"))}
        </label>

        <label className={`us-field${has("phone")}`}>
          <span>Mobile number</span>
          <input
            id={fieldId(key("phone"))}
            value={participant.phone}
            type="tel"
            inputMode="tel"
            placeholder="012-345 6789"
            autoComplete={auto("tel")}
            onChange={(event) => onChange({ phone: event.target.value })}
            {...invalid(key("phone"))}
          />
          {error(key("phone"))}
        </label>

        <p className="us-person-section us-field-wide">Platinum Pass &amp; insurance</p>

        <label className={`us-field${has("arrivalDate")}`}>
          <span>Arriving in Penang</span>
          <input
            id={fieldId(key("arrivalDate"))}
            value={participant.arrivalDate}
            type="date"
            max={participant.departureDate || undefined}
            onChange={(event) => onChange({ arrivalDate: event.target.value })}
            {...invalid(key("arrivalDate"))}
          />
          {error(key("arrivalDate"))}
        </label>

        <label className={`us-field${has("departureDate")}`}>
          <span>Leaving Penang</span>
          <input
            id={fieldId(key("departureDate"))}
            value={participant.departureDate}
            type="date"
            min={participant.arrivalDate || undefined}
            onChange={(event) => onChange({ departureDate: event.target.value })}
            {...invalid(key("departureDate"))}
          />
          {error(key("departureDate"))}
        </label>

        <label className={`us-field us-field-wide${has("address")}`}>
          <span>Home address</span>
          <textarea
            id={fieldId(key("address"))}
            value={participant.address}
            rows={2}
            autoComplete={auto("street-address")}
            onChange={(event) => onChange({ address: event.target.value })}
            {...invalid(key("address"))}
          />
          {error(key("address"))}
        </label>

        <label className={`us-field${has("emergencyContactName")}`}>
          <span>Emergency contact (optional)</span>
          <input
            id={fieldId(key("emergencyContactName"))}
            value={participant.emergencyContactName}
            autoComplete="off"
            placeholder="Name"
            onChange={(event) => onChange({ emergencyContactName: event.target.value })}
            {...invalid(key("emergencyContactName"))}
          />
          {error(key("emergencyContactName"))}
        </label>

        <label className={`us-field${has("emergencyContactPhone")}`}>
          <span>Their phone</span>
          <input
            id={fieldId(key("emergencyContactPhone"))}
            value={participant.emergencyContactPhone}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            onChange={(event) => onChange({ emergencyContactPhone: event.target.value })}
            {...invalid(key("emergencyContactPhone"))}
          />
          {error(key("emergencyContactPhone"))}
        </label>

        <label className={`us-field${has("emergencyContactRelationship")}`}>
          <span>Relationship</span>
          <select
            id={fieldId(key("emergencyContactRelationship"))}
            value={participant.emergencyContactRelationship}
            onChange={(event) =>
              onChange({ emergencyContactRelationship: event.target.value, emergencyRelationshipOther: "" })
            }
          >
            <option value="">Choose…</option>
            {BOOKING_RELATIONSHIPS.map((relationship) => (
              <option key={relationship} value={relationship}>
                {relationship}
              </option>
            ))}
          </select>
        </label>

        {participant.emergencyContactRelationship === "Other" && (
          <label className={`us-field${has("emergencyRelationshipOther")}`}>
            <span>Relationship (other)</span>
            <input
              id={fieldId(key("emergencyRelationshipOther"))}
              value={participant.emergencyRelationshipOther}
              autoComplete="off"
              onChange={(event) => onChange({ emergencyRelationshipOther: event.target.value })}
              {...invalid(key("emergencyRelationshipOther"))}
            />
            {error(key("emergencyRelationshipOther"))}
          </label>
        )}
      </div>
    </fieldset>
  );
});
