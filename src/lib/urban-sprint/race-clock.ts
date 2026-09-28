/**
 * The race clock's rules, with no database behind them, so the gamemaster's
 * ticking clock in the browser and the server agree on when a race is over.
 *
 * A race lasts RACE_MINUTES. The gamemaster starts it after drawing the
 * booster and stops it with Finish; a race nobody finishes ends itself when
 * the time is up, and counts as the full RACE_MINUTES. Stations can only be
 * confirmed while it's running.
 */

export const RACE_MINUTES = 180;
export const RACE_SECONDS = RACE_MINUTES * 60;

export type RacePhase = "ready" | "racing" | "finished";

type Clock = { raceStartedAt: string | null; raceFinishedAt: string | null };

export function racePhase(team: Clock, now: number = Date.now()): RacePhase {
  if (!team.raceStartedAt) return "ready";
  if (team.raceFinishedAt) return "finished";
  return now >= raceEndsAt(team.raceStartedAt) ? "finished" : "racing";
}

/** When a race started at `startedAt` runs out of time, in epoch ms. */
export function raceEndsAt(startedAt: string): number {
  return Date.parse(startedAt) + RACE_SECONDS * 1000;
}

/**
 * Seconds on the clock: so far while racing, the final time once finished,
 * never more than the race allows. A team that never started has none.
 */
export function raceSeconds(team: Clock, now: number = Date.now()): number | null {
  if (!team.raceStartedAt) return null;
  const end = team.raceFinishedAt ? Date.parse(team.raceFinishedAt) : now;
  const elapsed = Math.floor((end - Date.parse(team.raceStartedAt)) / 1000);
  return Math.min(Math.max(elapsed, 0), RACE_SECONDS);
}
