/**
 * The rules of an Urban Sprint team booking, in one place.
 *
 * Imported by the booking form in the browser and by the checkout route on the
 * server, so it must stay free of server-only imports. The server never takes
 * the browser's word for any of it: price, capacity and slot validity are all
 * recomputed from these constants when the booking is written.
 */

/** RM450 a team, however many people are on it. */
export const TEAM_PRICE_CENTS = 45_000;

export const BOOKING_CURRENCY = "myr";

export const TEAM_SIZE_MIN = 3;
export const TEAM_SIZE_MAX = 6;

/** Teams per slot. Kept in sync with `slot_capacity` in us_check_slot_capacity(). */
export const SLOT_CAPACITY = 5;

/** Daily start times, Malaysian wall-clock, 24-hour. */
export const SLOT_TIMES = ["09:00", "11:00", "13:00", "15:00", "17:00"] as const;

export type SlotTime = (typeof SLOT_TIMES)[number];

/** How far ahead a team can book, counting today. */
export const BOOKING_WINDOW_DAYS = 60;

/** A slot stops taking bookings this long before it starts. */
export const BOOKING_CUTOFF_MINUTES = 60;

/**
 * How long a place is held while the buyer is on Stripe's page. Stripe's
 * session expires a few minutes earlier (its minimum is 30), so the checkout
 * is always closed before the hold lapses and nobody can pay for a place that
 * has already been released to someone else.
 */
export const HOLD_MINUTES = 35;
export const CHECKOUT_SESSION_MINUTES = 31;

/**
 * Teams check in this long before their challenge time: a 9:00 AM race means
 * an 8:30 AM arrival. (The declaration ticked before payment and the Rules &
 * Regulations are not here — Traveloop is still finalising them, so they live
 * in us_settings and are edited in the console.)
 */
export const ARRIVAL_LEAD_MINUTES = 30;

export function isSlotTime(value: unknown): value is SlotTime {
  return typeof value === "string" && (SLOT_TIMES as readonly string[]).includes(value);
}

/* ---------------------------------- Dates --------------------------------- */

const MALAYSIA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Today's date in Malaysia, as YYYY-MM-DD. Malaysia is a fixed UTC+8 with no
 * daylight saving, so shifting by the offset is exact.
 */
export function malaysiaToday(now: Date = new Date()): string {
  return new Date(now.getTime() + MALAYSIA_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Every date a team can currently book, today first. */
export function bookableDates(now: Date = new Date()): string[] {
  const today = malaysiaToday(now);
  return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, index) => addDays(today, index));
}

/** The real instant a slot starts. */
export function slotStart(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+08:00`);
}

/**
 * Whether a slot is still open for booking at `now` — inside the window and
 * not about to start. Capacity is a separate question, answered by the
 * database.
 */
export function isSlotBookable(date: string, time: string, now: Date = new Date()): boolean {
  if (!isSlotTime(time)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return false;

  const dates = bookableDates(now);
  if (date < dates[0] || date > dates[dates.length - 1]) return false;

  return slotStart(date, time).getTime() - now.getTime() >= BOOKING_CUTOFF_MINUTES * 60_000;
}

/** "09:00" -> "08:30": when a team booked for `time` should check in. */
export function arrivalTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const total = hours * 60 + minutes - ARRIVAL_LEAD_MINUTES;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/* ------------------------------- Booking IDs ------------------------------ */

const BOOKING_ID = /^US-[A-HJ-NP-Z2-9]{8}$/;

/**
 * Tidies a Booking ID as someone typed it — lower case, spaces, or without the
 * "US-" prefix all find the same booking. Null when it can't be one.
 */
export function normalizeBookingId(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s-]/g, "");
  const candidate = compact.startsWith("US") && compact.length === 10
    ? `US-${compact.slice(2)}`
    : `US-${compact}`;
  return BOOKING_ID.test(candidate) ? candidate : null;
}

/**
 * The folder name the gamemasters file a team's photos under:
 * "US-ABCD1234-The Explorers". Characters no filesystem accepts are dropped
 * from the team name, so the name works on any laptop or drive.
 */
export function photoFolderName(reference: string, teamName: string): string {
  const safe = teamName
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return safe ? `${reference}-${safe}` : reference;
}

/* ------------------------------- Formatting ------------------------------- */

/** "13:00" -> "1:00 PM" */
export function formatSlotTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** "2026-10-03" -> "Sat, 3 Oct 2026" */
export function formatBookingDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-MY", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "2026-10-03" -> { weekday: "Sat", day: "3", month: "Oct" }, for the date strip. */
export function dateParts(date: string): { weekday: string; day: string; month: string } {
  const value = new Date(`${date}T00:00:00Z`);
  const part = (options: Intl.DateTimeFormatOptions) =>
    value.toLocaleDateString("en-MY", { timeZone: "UTC", ...options });

  return {
    weekday: part({ weekday: "short" }),
    day: part({ day: "numeric" }),
    month: part({ month: "short" }),
  };
}

/** 45000 -> "RM450", 45050 -> "RM450.50" */
export function formatRinggit(cents: number): string {
  const whole = cents % 100 === 0;
  return `RM${(cents / 100).toLocaleString("en-MY", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
