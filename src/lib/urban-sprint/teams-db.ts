import { randomInt } from "node:crypto";
import { getSupabase } from "@/lib/supabase";
import { slugify } from "./format";
import { toBooster } from "./boosters-db";
import type { Booster, Team } from "./types";

/**
 * Teams, and the two irreversible moments in the game's opening: a gamemaster
 * claiming a team, and that team drawing its booster. Both are decided by the
 * database, not by a read-then-write in application code, because both are
 * exactly the kind of thing two phones will attempt at the same second.
 */

const BOOSTER_EMBED =
  "us_boosters(id, name, category_id, bonus_percent, description, active, us_categories(name, color))";

type TeamRow = {
  id: number;
  name: string;
  slug: string;
  color: string;
  gamemaster_id: string | null;
  claimed_at: string | null;
  booster_id: number | null;
  booster_drawn_at: string | null;
  cached_points: number | string;
  cached_completions: number;
  active: boolean;
  race_started_at: string | null;
  race_finished_at: string | null;
  gamemaster: { display_name: string } | null;
  us_boosters: Parameters<typeof toBooster>[0] | null;
};

const SELECT = `id, name, slug, color, gamemaster_id, claimed_at, booster_id,
  booster_drawn_at, cached_points, cached_completions, active, race_started_at, race_finished_at,
  gamemaster:us_profiles!us_teams_gamemaster_id_fkey(display_name),
  ${BOOSTER_EMBED}`;

function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    color: row.color,
    gamemasterId: row.gamemaster_id,
    gamemasterName: row.gamemaster?.display_name ?? null,
    claimedAt: row.claimed_at,
    booster: row.us_boosters ? toBooster(row.us_boosters) : null,
    boosterDrawnAt: row.booster_drawn_at,
    points: Number(row.cached_points),
    stationsCompleted: row.cached_completions,
    active: row.active,
    raceStartedAt: row.race_started_at,
    raceFinishedAt: row.race_finished_at,
  };
}

export async function listTeams(options: { activeOnly?: boolean } = {}): Promise<Team[]> {
  let query = getSupabase().from("us_teams").select(SELECT).order("name");
  if (options.activeOnly) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as TeamRow[]).map(toTeam);
}

export async function getTeam(id: number): Promise<Team | null> {
  const { data, error } = await getSupabase()
    .from("us_teams")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toTeam(data as unknown as TeamRow) : null;
}

export async function getTeamForBooking(reference: string): Promise<Team | null> {
  const { data, error } = await getSupabase()
    .from("us_teams")
    .select(SELECT)
    .eq("slug", teamSlugForBooking(reference))
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toTeam(data as unknown as TeamRow) : null;
}

/** The team this gamemaster has claimed, or null if they still need to pick one. */
export async function getTeamForGamemaster(userId: string): Promise<Team | null> {
  const { data, error } = await getSupabase()
    .from("us_teams")
    .select(SELECT)
    .eq("gamemaster_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toTeam(data as unknown as TeamRow) : null;
}

export type ClaimResult =
  | { ok: true; teamId: number }
  | { ok: false; reason: "taken" | "already-running" | "missing" };

/**
 * Claims an unclaimed team for a gamemaster.
 *
 * The guard is `.is("gamemaster_id", null)` inside the UPDATE, not a SELECT
 * beforehand: under READ COMMITTED the second of two concurrent updates
 * re-evaluates that predicate against the row the winner just wrote, sees a
 * non-null gamemaster, and matches nothing. The loser gets "taken" instead of
 * silently stealing the team.
 */
export async function claimTeam(teamId: number, userId: string): Promise<ClaimResult> {
  const db = getSupabase();

  // A gamemaster who already runs a team is bounced here rather than by the
  // unique index, so re-submitting the choose-team form (a stale tab, a back
  // button) reads as "you already have one" rather than a database error.
  const { data: existing } = await db
    .from("us_teams")
    .select("id")
    .eq("gamemaster_id", userId)
    .maybeSingle();

  if (existing) {
    return existing.id === teamId
      ? { ok: true, teamId }
      : { ok: false, reason: "already-running" };
  }

  const { data, error } = await db
    .from("us_teams")
    .update({ gamemaster_id: userId, claimed_at: new Date().toISOString() })
    .eq("id", teamId)
    .eq("active", true)
    .is("gamemaster_id", null)
    .select("id")
    .maybeSingle();

  // 23505 is the one-team-per-gamemaster index: this gamemaster raced against
  // themselves on two devices and the other tab won.
  if (error) {
    return { ok: false, reason: error.code === "23505" ? "already-running" : "missing" };
  }

  return data ? { ok: true, teamId } : { ok: false, reason: "taken" };
}

/** Admin-only: hands a team back to the pool, e.g. a gamemaster dropped out. */
export async function releaseTeam(teamId: number): Promise<void> {
  const { error } = await getSupabase()
    .from("us_teams")
    .update({ gamemaster_id: null, claimed_at: null })
    .eq("id", teamId);

  if (error) throw new Error(error.message);
}

export type DrawResult =
  | { ok: true; booster: Booster; alreadyDrawn: boolean }
  | { ok: false; reason: "no-boosters" };

/**
 * Draws a random active booster for a team, server-side.
 *
 * The write is conditional on `booster_id` still being null, so the draw
 * happens exactly once per team however many times this is called — a double
 * tap, a refresh, or a second device all land on the booster the team already
 * has, returned with alreadyDrawn: true. There is no path that redraws.
 */
export async function drawBooster(teamId: number): Promise<DrawResult> {
  const db = getSupabase();

  const { data: boosters, error: boosterError } = await db
    .from("us_boosters")
    .select("id, name, category_id, bonus_percent, description, active, us_categories(name, color)")
    .eq("active", true);

  if (boosterError) throw new Error(boosterError.message);
  if (!boosters || boosters.length === 0) return { ok: false, reason: "no-boosters" };

  // randomInt over Math.random: the draw decides a competitive advantage, so
  // it uses the CSPRNG rather than a predictable PRNG.
  const pick = boosters[randomInt(boosters.length)];

  const { data: updated, error } = await db
    .from("us_teams")
    .update({ booster_id: pick.id, booster_drawn_at: new Date().toISOString() })
    .eq("id", teamId)
    .is("booster_id", null)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!updated) {
    const team = await getTeam(teamId);
    if (team?.booster) return { ok: true, booster: team.booster, alreadyDrawn: true };
    return { ok: false, reason: "no-boosters" };
  }

  return {
    ok: true,
    booster: toBooster(pick as unknown as Parameters<typeof toBooster>[0]),
    alreadyDrawn: false,
  };
}

/* ----------------------------- Booked teams ------------------------------ */

/**
 * A paid booking is a team in the station game too. Its us_teams row is made
 * when the booking is paid, and the two are linked by the Booking ID: a booked
 * team's slug is its reference, lower-cased ("us-abcd2345"). Slugs are unique,
 * so that is also what makes creating it safe to repeat.
 */
export function teamSlugForBooking(reference: string): string {
  return reference.toLowerCase();
}

/** The Booking ID behind a team, or null for a team an organiser added by hand. */
export function bookingReferenceForTeam(team: { slug: string }): string | null {
  return /^us-[a-z0-9]{8}$/.test(team.slug) ? team.slug.toUpperCase() : null;
}

/** Distinct, readable on both the dark game screens and the light console. */
const BOOKED_TEAM_COLORS = [
  "#ff5c38", "#2f80ed", "#27ae60", "#9b51e0", "#f2994a",
  "#eb5757", "#00a3a3", "#d6a300", "#e84393", "#5b6cff",
];

/**
 * Makes the booking's station-game team, if it doesn't have one yet. Called on
 * every delivery of the payment; the second and later calls change nothing,
 * so an organiser's later edits to the team (its name, colour) are kept.
 */
export async function ensureTeamForBooking(booking: {
  id: number;
  reference: string;
  teamName: string;
}): Promise<void> {
  const { error } = await getSupabase()
    .from("us_teams")
    .upsert(
      {
        name: booking.teamName,
        slug: teamSlugForBooking(booking.reference),
        color: BOOKED_TEAM_COLORS[booking.id % BOOKED_TEAM_COLORS.length],
      },
      { onConflict: "slug", ignoreDuplicates: true }
    );

  if (error) throw new Error(`Couldn't add ${booking.reference} to the station game: ${error.message}`);
}

export async function createTeam(input: {
  name: string;
  color: string;
  active: boolean;
}): Promise<void> {
  const { error } = await getSupabase().from("us_teams").insert({
    name: input.name,
    slug: slugify(input.name),
    color: input.color,
    active: input.active,
  });

  if (error) {
    throw new Error(
      error.code === "23505" ? "A team with that name already exists." : error.message
    );
  }
}

export async function updateTeam(
  id: number,
  patch: { name?: string; color?: string; active?: boolean }
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.active !== undefined) row.active = patch.active;

  const { error } = await getSupabase().from("us_teams").update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Deleting a team cascades to its completions, which is a real loss of score
 * history — so a team that has scored anything must be deactivated instead.
 */
export async function deleteTeam(id: number): Promise<void> {
  const db = getSupabase();

  const { count } = await db
    .from("us_completions")
    .select("id", { count: "exact", head: true })
    .eq("team_id", id);

  if ((count ?? 0) > 0) {
    throw new Error(
      "That team has score history. Deactivate it instead — deleting would erase its completion records."
    );
  }

  const { error } = await db.from("us_teams").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
