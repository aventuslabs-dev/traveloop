import { getSupabase } from "@/lib/supabase";
import { getBookingByReference, getBookingSummaries } from "./bookings-db";
import { racePhase, raceSeconds } from "./race-clock";
import { settleExpiredRaces } from "./race-db";
import { bookingReferenceForTeam, listTeams } from "./teams-db";

/**
 * The leaderboard — one board for every team, whatever day it raced: more
 * points first, then the shorter time, and teams level on both share a place.
 *
 * Finished races come from the bookings' results (the us_results_board view),
 * which a race writes when it finishes (race-db.ts) and staff can correct.
 * Races still running join the board live, with their points and time so far.
 * Every board in the app — public, landing page, team page, gamemaster,
 * console — reads getBoard(), so none of them can disagree about who is 3rd.
 */

export type ResultRow = {
  bookingId: number;
  reference: string;
  teamName: string;
  teamSize: number;
  date: string;
  time: string;
  points: number;
  seconds: number;
  rank: number;
  /** Still on the course: points and time so far. */
  racing: boolean;
  /** When a racing team's clock started, so a board can tick it live. */
  startedAt: string | null;
  /** The station-game team, and its colour, when it has one. */
  teamId: number | null;
  color: string | null;
};

type ViewRow = {
  id: number;
  reference: string;
  team_name: string;
  team_size: number;
  session_date: string;
  start_time: string;
  points: number | string;
  seconds: number;
  rank: number | string;
};

const SELECT = "id, reference, team_name, team_size, session_date, start_time, points, seconds, rank";

function toRow(row: ViewRow): ResultRow {
  return {
    bookingId: row.id,
    reference: row.reference,
    teamName: row.team_name,
    teamSize: row.team_size,
    date: row.session_date,
    time: row.start_time.slice(0, 5),
    points: Number(row.points),
    seconds: row.seconds,
    rank: Number(row.rank),
    racing: false,
    startedAt: null,
    teamId: null,
    color: null,
  };
}

/**
 * Finished results only, from the top — for the Results page and the CSV
 * export. `limit` of 0 means every ranked team; pages through PostgREST's
 * per-response cap so "All teams" really is all of them.
 */
export async function getResults(limit = 0): Promise<ResultRow[]> {
  const pageSize = 1000;
  const rows: ResultRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = limit > 0 ? Math.min(from + pageSize, limit) - 1 : from + pageSize - 1;

    const { data, error } = await getSupabase()
      .from("us_results_board")
      .select(SELECT)
      .order("rank", { ascending: true })
      .order("team_name", { ascending: true })
      .range(from, to);

    if (error) throw new Error(`Couldn't load results: ${error.message}`);

    const page = ((data ?? []) as ViewRow[]).map(toRow);
    rows.push(...page);
    if (page.length < to - from + 1 || (limit > 0 && rows.length >= limit)) return rows;
  }
}

/**
 * The one leaderboard: finished teams and teams racing right now, ranked
 * together. `limit` of 0 means every team.
 */
export async function getBoard(limit = 0): Promise<ResultRow[]> {
  // A race whose 180 minutes ran out becomes a result before anyone reads it.
  await settleExpiredRaces().catch((error) =>
    console.error("[us-board] Couldn't settle finished races:", error)
  );

  const [finished, teams] = await Promise.all([getResults(), listTeams()]);
  const teamBySlug = new Map(teams.map((team) => [team.slug, team]));
  const done = new Set(finished.map((row) => row.reference));

  const now = Date.now();
  const racing = teams.filter((team) => {
    const reference = bookingReferenceForTeam(team);
    return reference !== null && !done.has(reference) && racePhase(team, now) === "racing";
  });
  const bookings = await getBookingSummaries(racing.map((team) => bookingReferenceForTeam(team)!));

  const rows: ResultRow[] = finished.map((row) => {
    const team = teamBySlug.get(row.reference.toLowerCase());
    return { ...row, teamId: team?.id ?? null, color: team?.color ?? null };
  });

  for (const team of racing) {
    const booking = bookings.get(bookingReferenceForTeam(team)!);
    if (!booking || booking.status !== "paid") continue;
    rows.push({
      bookingId: booking.id,
      reference: booking.reference,
      teamName: team.name,
      teamSize: booking.teamSize,
      date: booking.date,
      time: booking.time,
      points: team.points,
      seconds: raceSeconds(team, now) ?? 0,
      rank: 0,
      racing: true,
      startedAt: team.raceStartedAt,
      teamId: team.id,
      color: team.color,
    });
  }

  rows.sort(
    (a, b) => b.points - a.points || a.seconds - b.seconds || a.teamName.localeCompare(b.teamName)
  );

  // rank(), as the view does it: level on points and time, level in place.
  rows.forEach((row, index) => {
    const previous = rows[index - 1];
    row.rank =
      previous && previous.points === row.points && previous.seconds === row.seconds
        ? previous.rank
        : index + 1;
  });

  return limit > 0 ? rows.slice(0, limit) : rows;
}

/** A team's place on the board: "3rd of 12", or no place before its race. */
export async function getStanding(reference: string): Promise<{ row: ResultRow | null; total: number }> {
  const board = await getBoard();
  return { row: board.find((row) => row.reference === reference) ?? null, total: board.length };
}

export type RankingLookup =
  | { kind: "not_found" }
  /** Booked but not (yet) paid — it will never appear on the board as it stands. */
  | { kind: "unpaid"; teamName: string }
  /** Paid, but hasn't raced yet. */
  | { kind: "awaiting"; teamName: string; date: string; time: string }
  /** On the board — finished, or racing right now (row.racing). */
  | { kind: "ranked"; row: ResultRow; total: number };

/**
 * "Check my ranking". Takes an already-normalised Booking ID, and returns only
 * what the public board would show anyway — team name, rank, points, time —
 * never the participants behind it.
 */
export async function lookupRanking(reference: string): Promise<RankingLookup> {
  const booking = await getBookingByReference(reference);
  if (!booking) return { kind: "not_found" };
  if (booking.status !== "paid") return { kind: "unpaid", teamName: booking.teamName };

  const { row, total } = await getStanding(reference);
  if (!row) {
    return { kind: "awaiting", teamName: booking.teamName, date: booking.date, time: booking.time };
  }

  return { kind: "ranked", row, total };
}
