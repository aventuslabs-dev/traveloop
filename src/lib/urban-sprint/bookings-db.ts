import { getSupabase } from "@/lib/supabase";
import {
  BOOKING_CURRENCY,
  HOLD_MINUTES,
  SLOT_CAPACITY,
  SLOT_TIMES,
  TEAM_PRICE_CENTS,
  bookableDates,
  isSlotBookable,
  normalizeBookingId,
  type SlotTime,
} from "./booking-config";
import type { DocumentType, Participant, Sex, ValidBooking } from "./booking-form";

/**
 * Team bookings. The capacity rule lives in the database (see
 * us_check_slot_capacity in urban-sprint-schema.sql); this module reads the
 * result and moves a booking through its statuses, and never counts places
 * itself before writing.
 */

export type BookingStatus = "pending" | "processing" | "paid" | "expired" | "failed" | "cancelled";

/**
 * A participant as stored. The pass registration fields are null only for
 * people booked before every racer got a Platinum Pass.
 */
export type StoredParticipant = Omit<Participant, "arrivalDate" | "departureDate" | "address"> & {
  position: number;
  arrivalDate: string | null;
  departureDate: string | null;
  address: string | null;
};

export type StoredTeamBooking = {
  id: number;
  reference: string;
  date: string;
  time: string;
  teamName: string;
  teamSize: number;
  amountCents: number;
  currency: string;
  status: BookingStatus;
  holdExpiresAt: string | null;
  stripeSessionId: string | null;
  payerEmail: string | null;
  payerName: string | null;
  payerPhone: string | null;
  termsVersion: string;
  /** The declaration exactly as it read when ticked. Null on bookings made before it was recorded. */
  termsText: string | null;
  termsAcceptedAt: string;
  paidAt: string | null;
  confirmationSentAt: string | null;
  confirmationError: string | null;
  createdAt: string;
  /** Entered by staff after the race; both or neither. */
  resultPoints: number | null;
  resultSeconds: number | null;
  resultEnteredAt: string | null;
  participants: StoredParticipant[];
};

export type SlotAvailability = {
  time: SlotTime;
  remaining: number;
  /** False once the slot is inside the booking cutoff, however many places are left. */
  open: boolean;
};

export type DayAvailability = {
  date: string;
  slots: SlotAvailability[];
};

/** Raised when the database refuses a hold because the slot filled first. */
export class SlotFullError extends Error {
  constructor() {
    super("That slot is fully booked.");
    this.name = "SlotFullError";
  }
}

type ParticipantRow = {
  position: number;
  full_name: string;
  document_type: DocumentType;
  document_number: string;
  nationality: string;
  sex: Sex;
  age: number;
  email: string;
  phone: string;
  arrival_date: string | null;
  departure_date: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
};

type BookingRow = {
  id: number;
  reference: string;
  session_date: string;
  start_time: string;
  team_name: string;
  team_size: number;
  amount_cents: number;
  currency: string;
  status: BookingStatus;
  hold_expires_at: string | null;
  stripe_session_id: string | null;
  payer_email: string | null;
  payer_name: string | null;
  payer_phone: string | null;
  terms_version: string;
  terms_text: string | null;
  terms_accepted_at: string;
  paid_at: string | null;
  confirmation_sent_at: string | null;
  confirmation_error: string | null;
  created_at: string;
  result_points: number | string | null;
  result_seconds: number | null;
  result_entered_at: string | null;
  us_booking_participants?: ParticipantRow[];
};

const SELECT = `id, reference, session_date, start_time, team_name, team_size, amount_cents,
  currency, status, hold_expires_at, stripe_session_id, payer_email, payer_name, payer_phone,
  terms_version, terms_text, terms_accepted_at, paid_at, confirmation_sent_at, confirmation_error,
  created_at, result_points, result_seconds, result_entered_at,
  us_booking_participants(position, full_name, document_type, document_number, nationality,
    sex, age, email, phone, arrival_date, departure_date, address, emergency_contact_name,
    emergency_contact_phone, emergency_contact_relationship)`;

/** Postgres hands `time` back as "09:00:00"; everything here speaks "09:00". */
function hhmm(time: string): string {
  return time.slice(0, 5);
}

function toBooking(row: BookingRow): StoredTeamBooking {
  const participants = (row.us_booking_participants ?? [])
    .map((p) => ({
      position: p.position,
      fullName: p.full_name,
      documentType: p.document_type,
      documentNumber: p.document_number,
      nationality: p.nationality,
      sex: p.sex,
      age: p.age,
      email: p.email,
      phone: p.phone,
      arrivalDate: p.arrival_date,
      departureDate: p.departure_date,
      address: p.address,
      emergencyContactName: p.emergency_contact_name,
      emergencyContactPhone: p.emergency_contact_phone,
      emergencyContactRelationship: p.emergency_contact_relationship,
    }))
    .sort((a, b) => a.position - b.position);

  return {
    id: row.id,
    reference: row.reference,
    date: row.session_date,
    time: hhmm(row.start_time),
    teamName: row.team_name,
    teamSize: row.team_size,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    holdExpiresAt: row.hold_expires_at,
    stripeSessionId: row.stripe_session_id,
    payerEmail: row.payer_email,
    payerName: row.payer_name,
    payerPhone: row.payer_phone,
    termsVersion: row.terms_version,
    termsText: row.terms_text,
    termsAcceptedAt: row.terms_accepted_at,
    paidAt: row.paid_at,
    confirmationSentAt: row.confirmation_sent_at,
    confirmationError: row.confirmation_error,
    createdAt: row.created_at,
    // numeric arrives from PostgREST as a string.
    resultPoints: row.result_points === null ? null : Number(row.result_points),
    resultSeconds: row.result_seconds,
    resultEnteredAt: row.result_entered_at,
    participants,
  };
}

/* ------------------------------ Availability ------------------------------ */

/**
 * Places left in every slot across the booking window, from the aggregate
 * view rather than the booking rows — the page that shows this is public, and
 * has no reason to load anyone's passport number to count to five.
 */
export async function getAvailability(now: Date = new Date()): Promise<DayAvailability[]> {
  const dates = bookableDates(now);

  const { data, error } = await getSupabase()
    .from("us_slot_bookings")
    .select("session_date, start_time, teams")
    .gte("session_date", dates[0])
    .lte("session_date", dates[dates.length - 1]);

  if (error) throw new Error(`Couldn't load slot availability: ${error.message}`);

  const taken = new Map<string, number>();
  for (const row of (data ?? []) as { session_date: string; start_time: string; teams: number }[]) {
    taken.set(`${row.session_date} ${hhmm(row.start_time)}`, row.teams);
  }

  return dates.map((date) => ({
    date,
    slots: SLOT_TIMES.map((time) => ({
      time,
      remaining: Math.max(0, SLOT_CAPACITY - (taken.get(`${date} ${time}`) ?? 0)),
      open: isSlotBookable(date, time, now),
    })),
  }));
}

/* -------------------------------- Writing --------------------------------- */

/**
 * Writes the booking as a hold on its slot, then its participants.
 *
 * Throws SlotFullError when the database refuses the hold. The participants
 * go in as a second statement; if that fails the hold is deleted again, so a
 * half-written booking can't sit on a place.
 */
export async function createPendingBooking(
  booking: ValidBooking,
  /** The declaration as the server has it now — never the browser's copy. */
  consent: { version: string; text: string },
  now: Date = new Date()
): Promise<{ id: number; reference: string }> {
  const db = getSupabase();

  // Stale holds carry personal details for teams that never paid; clearing
  // them on new-booking traffic saves needing a cron job.
  void deleteAbandonedBookings(now);

  const { data, error } = await db
    .from("us_bookings")
    .insert({
      session_date: booking.date,
      start_time: booking.time,
      team_name: booking.teamName,
      team_size: booking.participants.length,
      amount_cents: TEAM_PRICE_CENTS,
      currency: BOOKING_CURRENCY,
      status: "pending",
      hold_expires_at: new Date(now.getTime() + HOLD_MINUTES * 60_000).toISOString(),
      terms_version: consent.version,
      terms_text: consent.text,
      terms_accepted_at: now.toISOString(),
    })
    .select("id, reference")
    .single<{ id: number; reference: string }>();

  if (error) {
    if (error.message.includes("us_slot_full")) throw new SlotFullError();
    throw new Error(`Couldn't hold the slot: ${error.message}`);
  }

  const { error: participantError } = await db.from("us_booking_participants").insert(
    booking.participants.map((participant, position) => ({
      booking_id: data.id,
      position,
      full_name: participant.fullName,
      document_type: participant.documentType,
      document_number: participant.documentNumber,
      nationality: participant.nationality,
      sex: participant.sex,
      age: participant.age,
      email: participant.email,
      phone: participant.phone,
      arrival_date: participant.arrivalDate,
      departure_date: participant.departureDate,
      address: participant.address,
      emergency_contact_name: participant.emergencyContactName,
      emergency_contact_phone: participant.emergencyContactPhone,
      emergency_contact_relationship: participant.emergencyContactRelationship,
    }))
  );

  if (participantError) {
    await db.from("us_bookings").delete().eq("id", data.id);
    throw new Error(`Couldn't save the participants: ${participantError.message}`);
  }

  return data;
}

export async function attachCheckoutSession(bookingId: number, sessionId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("us_bookings")
    .update({ stripe_session_id: sessionId, updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) throw new Error(`Couldn't link booking ${bookingId} to ${sessionId}: ${error.message}`);
}

/**
 * Gives an unpaid booking's place back. Only ever moves pending or processing
 * bookings, so a late or repeated event can't undo a payment.
 */
export async function releaseBooking(
  match: { id: number } | { reference: string } | { sessionId: string },
  status: "expired" | "failed" | "cancelled"
): Promise<void> {
  let query = getSupabase()
    .from("us_bookings")
    .update({ status, updated_at: new Date().toISOString() })
    .in("status", ["pending", "processing"]);

  if ("id" in match) query = query.eq("id", match.id);
  else if ("reference" in match) query = query.eq("reference", match.reference);
  else query = query.eq("stripe_session_id", match.sessionId);

  const { error } = await query;
  if (error) throw new Error(`Couldn't release booking: ${error.message}`);
}

/** Checkout finished but the money is still settling (FPX): keep the place, with no expiry. */
export async function markBookingProcessing(sessionId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("us_bookings")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("stripe_session_id", sessionId)
    .eq("status", "pending");

  if (error) throw new Error(`Couldn't mark ${sessionId} processing: ${error.message}`);
}

/**
 * Records the payment. Idempotent: a redelivered event finds the booking
 * already paid and changes nothing but returns it, so the caller can still
 * check whether the confirmation went out.
 *
 * Returns the status the booking had *before* this call too, because a
 * payment landing on a booking that was already released is worth shouting
 * about — its place may have been sold again in between.
 */
export async function markBookingPaid(
  sessionId: string,
  payment: {
    paymentIntentId: string | null;
    payerEmail: string | null;
    payerName: string | null;
    payerPhone: string | null;
  }
): Promise<{ booking: StoredTeamBooking; previousStatus: BookingStatus } | null> {
  const existing = await getBookingBySessionId(sessionId);
  if (!existing) return null;
  if (existing.status === "paid") return { booking: existing, previousStatus: "paid" };

  const now = new Date().toISOString();
  const { error } = await getSupabase()
    .from("us_bookings")
    .update({
      status: "paid",
      paid_at: now,
      hold_expires_at: null,
      payment_intent_id: payment.paymentIntentId,
      payer_email: payment.payerEmail,
      payer_name: payment.payerName,
      payer_phone: payment.payerPhone,
      updated_at: now,
    })
    .eq("id", existing.id)
    .neq("status", "paid");

  if (error) throw new Error(`Couldn't record payment for ${sessionId}: ${error.message}`);

  const updated = await getBookingBySessionId(sessionId);
  return updated ? { booking: updated, previousStatus: existing.status } : null;
}

export async function markConfirmationSent(bookingId: number): Promise<void> {
  const { error } = await getSupabase()
    .from("us_bookings")
    .update({ confirmation_sent_at: new Date().toISOString(), confirmation_error: null })
    .eq("id", bookingId);

  if (error) console.error(`[us-bookings] Couldn't mark ${bookingId} confirmed:`, error.message);
}

export async function recordConfirmationFailure(bookingId: number, reason: string): Promise<void> {
  const { error } = await getSupabase()
    .from("us_bookings")
    .update({ confirmation_error: reason.slice(0, 1000) })
    .eq("id", bookingId);

  if (error) console.error(`[us-bookings] Couldn't record failure for ${bookingId}:`, error.message);
}

/**
 * Unpaid bookings older than a day. By then Stripe has expired their checkout
 * long since, so nothing can revive them, and what's left is identity numbers
 * of people who never came. Lost sales are still on record in
 * payment_attempts, written by the Stripe webhook.
 */
async function deleteAbandonedBookings(now: Date): Promise<void> {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { error } = await getSupabase()
    .from("us_bookings")
    .delete()
    .in("status", ["pending", "expired", "failed"])
    .lt("created_at", cutoff);

  if (error) console.error("[us-bookings] Failed to clear abandoned bookings:", error.message);
}

/* -------------------------------- Reading --------------------------------- */

export async function getBookingBySessionId(sessionId: string): Promise<StoredTeamBooking | null> {
  const { data, error } = await getSupabase()
    .from("us_bookings")
    .select(SELECT)
    .eq("stripe_session_id", sessionId)
    .maybeSingle<BookingRow>();

  if (error) throw new Error(`Couldn't load booking for ${sessionId}: ${error.message}`);
  return data ? toBooking(data) : null;
}

export async function getBookingByReference(reference: string): Promise<StoredTeamBooking | null> {
  const { data, error } = await getSupabase()
    .from("us_bookings")
    .select(SELECT)
    .eq("reference", reference)
    .maybeSingle<BookingRow>();

  if (error) throw new Error(`Couldn't load booking ${reference}: ${error.message}`);
  return data ? toBooking(data) : null;
}

export type BookingSummary = {
  id: number;
  reference: string;
  date: string;
  time: string;
  teamSize: number;
  status: BookingStatus;
  payerName: string | null;
  resultPoints: number | null;
  resultSeconds: number | null;
};

/**
 * The race behind each booked team, by Booking ID, for the console's Teams
 * page. Leaves the participants out: a team list has no use for anyone's
 * passport number.
 */
export async function getBookingSummaries(references: string[]): Promise<Map<string, BookingSummary>> {
  const summaries = new Map<string, BookingSummary>();
  if (references.length === 0) return summaries;

  const db = getSupabase();
  // Chunked: each reference goes into the URL, which has a length limit.
  for (let start = 0; start < references.length; start += 100) {
    const { data, error } = await db
      .from("us_bookings")
      .select("id, reference, session_date, start_time, team_size, status, payer_name, result_points, result_seconds")
      .in("reference", references.slice(start, start + 100));

    if (error) throw new Error(`Couldn't load the teams' bookings: ${error.message}`);

    for (const row of data ?? []) {
      summaries.set(row.reference, {
        id: row.id,
        reference: row.reference,
        date: row.session_date,
        time: hhmm(row.start_time),
        teamSize: row.team_size,
        status: row.status as BookingStatus,
        payerName: row.payer_name,
        resultPoints: row.result_points === null ? null : Number(row.result_points),
        resultSeconds: row.result_seconds,
      });
    }
  }

  return summaries;
}

/**
 * Bookings for the organisers' console: everything that holds or held a
 * place, on or after `from` (or before it, for the past view). Expired and
 * failed checkouts are left out — they never became teams.
 */
export async function listBookings(options: {
  from: string;
  direction: "upcoming" | "past";
}): Promise<StoredTeamBooking[]> {
  let query = getSupabase()
    .from("us_bookings")
    .select(SELECT)
    .in("status", ["pending", "processing", "paid", "cancelled"]);

  query =
    options.direction === "upcoming"
      ? query
          .gte("session_date", options.from)
          .order("session_date", { ascending: true })
          .order("start_time", { ascending: true })
      : query
          .lt("session_date", options.from)
          .order("session_date", { ascending: false })
          .order("start_time", { ascending: false });

  const { data, error } = await query.order("created_at", { ascending: true }).limit(500);
  if (error) throw new Error(`Couldn't load bookings: ${error.message}`);

  return ((data ?? []) as unknown as BookingRow[])
    .map(toBooking)
    // A pending hold whose time ran out is an abandoned checkout, not a team.
    .filter(
      (booking) =>
        booking.status !== "pending" ||
        (booking.holdExpiresAt !== null && Date.parse(booking.holdExpiresAt) > Date.now())
    );
}

/**
 * Finds bookings by Booking ID or team name, across every date and status —
 * staff searching at the check-in desk need to see an unpaid or failed booking
 * too, to tell the team why they aren't on the list.
 */
export async function searchBookings(query: string): Promise<StoredTeamBooking[]> {
  const reference = normalizeBookingId(query);
  let request = getSupabase().from("us_bookings").select(SELECT);

  if (reference) {
    request = request.eq("reference", reference);
  } else {
    // PostgREST's or() filter is comma- and bracket-delimited, and % and _
    // are LIKE wildcards; none of them belong in a team name search.
    const term = query.replace(/[,()%_*\\"]/g, " ").trim();
    if (!term) return [];
    request = request.or(`team_name.ilike.%${term}%,reference.ilike.%${term}%`);
  }

  const { data, error } = await request
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(100);

  if (error) throw new Error(`Couldn't search bookings: ${error.message}`);
  return ((data ?? []) as unknown as BookingRow[]).map(toBooking);
}

/**
 * Records a team's result. Only a paid booking can have one — a team that
 * never paid never raced — and the update says so rather than silently
 * matching nothing.
 */
export async function setBookingResult(
  bookingId: number,
  result: { points: number; seconds: number },
  enteredBy: string
): Promise<void> {
  const { data, error } = await getSupabase()
    .from("us_bookings")
    .update({
      result_points: result.points,
      result_seconds: result.seconds,
      result_entered_at: new Date().toISOString(),
      result_entered_by: enteredBy,
    })
    .eq("id", bookingId)
    .eq("status", "paid")
    .select("id");

  if (error) throw new Error(`Couldn't save the result: ${error.message}`);
  if (!data || data.length === 0) throw new Error("Only a paid booking can have a result.");
}

export async function clearBookingResult(bookingId: number): Promise<void> {
  const { error } = await getSupabase()
    .from("us_bookings")
    .update({
      result_points: null,
      result_seconds: null,
      result_entered_at: null,
      result_entered_by: null,
    })
    .eq("id", bookingId);

  if (error) throw new Error(`Couldn't clear the result: ${error.message}`);
}

/**
 * Every booking that holds or held a place, for the CSV export — paged,
 * because PostgREST caps a single response and a full campaign runs past it.
 */
export async function listBookingsForExport(): Promise<StoredTeamBooking[]> {
  const pageSize = 500;
  const rows: StoredTeamBooking[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await getSupabase()
      .from("us_bookings")
      .select(SELECT)
      .in("status", ["processing", "paid", "cancelled"])
      .order("session_date", { ascending: true })
      .order("start_time", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Couldn't load bookings for export: ${error.message}`);

    const page = ((data ?? []) as unknown as BookingRow[]).map(toBooking);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

/**
 * Paid teams whose race day has come and who have no result yet — the list
 * staff work down after each race. Most recent race first.
 */
export async function listAwaitingResults(today: string): Promise<StoredTeamBooking[]> {
  const { data, error } = await getSupabase()
    .from("us_bookings")
    .select(SELECT)
    .eq("status", "paid")
    .is("result_points", null)
    .lte("session_date", today)
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(200);

  if (error) throw new Error(`Couldn't load teams awaiting results: ${error.message}`);
  return ((data ?? []) as unknown as BookingRow[]).map(toBooking);
}

/* -------------------------------- Console --------------------------------- */

export type BookingStats = {
  /** Paid teams racing today or later. */
  upcomingTeams: number;
  upcomingRacers: number;
  /** Paid teams racing today. */
  todayTeams: number;
  /** Every paid team, and what they paid. */
  paidTeams: number;
  revenueCents: number;
  /** Paid, raced (today or earlier) and still without a result. */
  awaitingResults: number;
  /** Paid, with no confirmation email out. */
  emailIssues: number;
  /** Checkout finished, money still settling (FPX). */
  settling: number;
};

type StatsRow = {
  session_date: string;
  team_size: number;
  amount_cents: number;
  status: BookingStatus;
  confirmation_sent_at: string | null;
  result_points: number | string | null;
};

/**
 * The console overview's headline numbers. One narrow read of every live
 * booking (no participants, no personal details), paged past PostgREST's row
 * cap, then counted here so the tiles agree with each other.
 */
export async function getBookingStats(today: string): Promise<BookingStats> {
  const rows: StatsRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await getSupabase()
      .from("us_bookings")
      .select("session_date, team_size, amount_cents, status, confirmation_sent_at, result_points")
      .in("status", ["processing", "paid"])
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Couldn't load booking stats: ${error.message}`);
    rows.push(...((data ?? []) as StatsRow[]));
    if (!data || data.length < pageSize) break;
  }

  const paid = rows.filter((row) => row.status === "paid");
  const upcoming = paid.filter((row) => row.session_date >= today);

  return {
    upcomingTeams: upcoming.length,
    upcomingRacers: upcoming.reduce((sum, row) => sum + row.team_size, 0),
    todayTeams: paid.filter((row) => row.session_date === today).length,
    paidTeams: paid.length,
    revenueCents: paid.reduce((sum, row) => sum + row.amount_cents, 0),
    awaitingResults: paid.filter((row) => row.session_date <= today && row.result_points === null).length,
    emailIssues: paid.filter((row) => !row.confirmation_sent_at).length,
    settling: rows.filter((row) => row.status === "processing").length,
  };
}

/**
 * Bookings someone should look at: paid teams whose confirmation never went
 * out, and payments still settling. Oldest problem first.
 */
export async function listBookingsNeedingAttention(): Promise<StoredTeamBooking[]> {
  const { data, error } = await getSupabase()
    .from("us_bookings")
    .select(SELECT)
    .or("and(status.eq.paid,confirmation_sent_at.is.null),status.eq.processing")
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) throw new Error(`Couldn't load bookings needing attention: ${error.message}`);
  return ((data ?? []) as unknown as BookingRow[]).map(toBooking);
}
