import { getSupabase } from "@/lib/supabase";
import { RACE_SECONDS, raceSeconds } from "./race-clock";
import { bookingReferenceForTeam } from "./teams-db";

/**
 * Starting and stopping a team's race, and turning a finished race into its
 * result. The clock's rules are in race-clock.ts; these are its writes.
 *
 * A finished race writes its points and time to the booking's result, which
 * is what the one leaderboard ranks (results-db.getBoard). Staff can still
 * correct a result on the Results page afterwards.
 */

export type StartResult = { ok: true } | { ok: false; reason: "no-booster" | "already-started" };

/**
 * Starts the clock. Conditional on it not having started, so a double tap
 * can't restart a race that's already running.
 */
export async function startRace(teamId: number): Promise<StartResult> {
  const { data, error } = await getSupabase()
    .from("us_teams")
    .update({ race_started_at: new Date().toISOString() })
    .eq("id", teamId)
    .is("race_started_at", null)
    .not("booster_id", "is", null)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`Couldn't start the race: ${error.message}`);
  if (data) return { ok: true };

  const { data: team } = await getSupabase()
    .from("us_teams")
    .select("booster_id, race_started_at")
    .eq("id", teamId)
    .maybeSingle();
  return { ok: false, reason: team?.race_started_at ? "already-started" : "no-booster" };
}

/**
 * Stops the clock now — or at the time limit, if Finish comes after it — and
 * records the result. Safe to repeat: a finished race stays as it finished.
 */
export async function finishRace(teamId: number, finishedBy: string | null): Promise<void> {
  const db = getSupabase();
  const { data: team, error } = await db
    .from("us_teams")
    .select("race_started_at, race_finished_at")
    .eq("id", teamId)
    .maybeSingle();

  if (error) throw new Error(`Couldn't finish the race: ${error.message}`);
  if (!team?.race_started_at) throw new Error("The race hasn't started.");

  if (!team.race_finished_at) {
    const limit = Date.parse(team.race_started_at) + RACE_SECONDS * 1000;
    const { error: finishError } = await db
      .from("us_teams")
      .update({ race_finished_at: new Date(Math.min(Date.now(), limit)).toISOString() })
      .eq("id", teamId)
      .is("race_finished_at", null);
    if (finishError) throw new Error(`Couldn't finish the race: ${finishError.message}`);
  }

  await recordRaceResult(teamId, finishedBy);
}

/**
 * Ends every race whose time ran out without anyone pressing Finish. There's
 * no scheduler: this runs whenever the board is read, which is always before
 * anyone could see a stale race.
 */
export async function settleExpiredRaces(): Promise<void> {
  const db = getSupabase();
  const cutoff = new Date(Date.now() - RACE_SECONDS * 1000).toISOString();

  const { data, error } = await db
    .from("us_teams")
    .select("id, race_started_at")
    .is("race_finished_at", null)
    .not("race_started_at", "is", null)
    .lte("race_started_at", cutoff);

  if (error) throw new Error(`Couldn't check for finished races: ${error.message}`);

  for (const team of data ?? []) {
    const finishedAt = new Date(Date.parse(team.race_started_at) + RACE_SECONDS * 1000).toISOString();
    await db
      .from("us_teams")
      .update({ race_finished_at: finishedAt })
      .eq("id", team.id)
      .is("race_finished_at", null);
    await recordRaceResult(team.id, null);
  }
}

/**
 * Writes a finished race's points and time to its booking. Also called after
 * a station is voided, so a correction after the finish reaches the board.
 * Does nothing for a race still running, or a team added by hand (it has no
 * booking to hold a result).
 */
export async function recordRaceResult(teamId: number, enteredBy: string | null): Promise<void> {
  const db = getSupabase();
  const { data: team, error } = await db
    .from("us_teams")
    .select("slug, cached_points, race_started_at, race_finished_at")
    .eq("id", teamId)
    .maybeSingle();

  if (error) throw new Error(`Couldn't read the team's race: ${error.message}`);
  if (!team?.race_finished_at) return;

  const reference = bookingReferenceForTeam(team);
  if (!reference) return;

  const seconds = raceSeconds({ raceStartedAt: team.race_started_at, raceFinishedAt: team.race_finished_at });

  const { error: resultError } = await db
    .from("us_bookings")
    .update({
      result_points: Number(team.cached_points),
      // The results board needs a positive time; a race finished the second it
      // started counts as one.
      result_seconds: Math.max(seconds ?? 0, 1),
      result_entered_at: new Date().toISOString(),
      result_entered_by: enteredBy,
    })
    .eq("reference", reference)
    .eq("status", "paid");

  if (resultError) throw new Error(`Couldn't record the result: ${resultError.message}`);
}
