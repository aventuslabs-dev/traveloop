import { getSupabase } from "@/lib/supabase";
import { scoreStation } from "./scoring";
import { getStation } from "./stations-db";
import { getTeam } from "./teams-db";
import type { Completion, ScoreBreakdown } from "./types";

/**
 * The score ledger: the only place points are ever awarded.
 *
 * Nothing about an award is taken from the request. The action layer supplies
 * a team id and a station id; the base points, the booster, the percentage and
 * the total are all re-read from the database here and recomputed through
 * scoreStation(), so a client that posts its own numbers changes nothing.
 */

type Row = {
  id: number;
  team_id: number;
  station_id: number;
  gamemaster_id: string | null;
  station_name: string;
  category_name: string;
  base_points: number | string;
  booster_name: string;
  bonus_percent: number | string;
  bonus_points: number | string;
  booster_applied: boolean;
  total_points: number | string;
  status: string;
  void_reason: string | null;
  created_at: string;
  us_teams: { name: string; color: string } | null;
  gamemaster: { display_name: string } | null;
};

const SELECT = `id, team_id, station_id, gamemaster_id, station_name, category_name,
  base_points, booster_name, bonus_percent, bonus_points, booster_applied,
  total_points, status, void_reason, created_at,
  us_teams(name, color),
  gamemaster:us_profiles!us_completions_gamemaster_id_fkey(display_name)`;

function toCompletion(row: Row): Completion {
  return {
    id: row.id,
    teamId: row.team_id,
    teamName: row.us_teams?.name ?? "Unknown team",
    teamColor: row.us_teams?.color ?? "#ff5c38",
    stationId: row.station_id,
    stationName: row.station_name,
    categoryName: row.category_name,
    gamemasterId: row.gamemaster_id,
    gamemasterName: row.gamemaster?.display_name ?? "—",
    basePoints: Number(row.base_points),
    boosterName: row.booster_name,
    bonusPercent: Number(row.bonus_percent),
    bonusPoints: Number(row.bonus_points),
    boosterApplied: row.booster_applied,
    totalPoints: Number(row.total_points),
    status: row.status === "void" ? "void" : "valid",
    voidReason: row.void_reason,
    createdAt: row.created_at,
  };
}

export type CompleteResult =
  | { ok: true; breakdown: ScoreBreakdown; stationName: string }
  | {
      ok: false;
      reason: "duplicate" | "station-missing" | "station-inactive" | "team-missing";
    };

/**
 * Records a station completion and awards its points.
 *
 * Duplicates and double taps are both stopped by the same thing: the partial
 * unique index on (team_id, station_id) where status = 'valid'. The check
 * below is only there to produce a friendly message first — two taps that
 * arrive together both pass it, and the index still lets exactly one through.
 * The team's total is then recomputed from the ledger by trigger, so no code
 * here increments a counter.
 */
export async function completeStation(
  teamId: number,
  stationId: number,
  gamemasterId: string
): Promise<CompleteResult> {
  const [team, station] = await Promise.all([getTeam(teamId), getStation(stationId)]);

  if (!team) return { ok: false, reason: "team-missing" };
  if (!station) return { ok: false, reason: "station-missing" };
  if (!station.active) return { ok: false, reason: "station-inactive" };

  const breakdown = scoreStation(station, team.booster);

  const { error } = await getSupabase().from("us_completions").insert({
    team_id: teamId,
    station_id: stationId,
    gamemaster_id: gamemasterId,
    station_name: station.name,
    category_id: station.categoryId,
    category_name: station.categoryName,
    base_points: breakdown.basePoints,
    booster_id: team.booster?.id ?? null,
    // Snapshots, not lookups: renaming a booster or re-pricing a station later
    // must not rewrite what this team was already awarded.
    booster_name: breakdown.boosterApplied ? breakdown.boosterName : "",
    bonus_percent: breakdown.boosterApplied ? breakdown.bonusPercent : 0,
    bonus_points: breakdown.bonusPoints,
    booster_applied: breakdown.boosterApplied,
    total_points: breakdown.totalPoints,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, reason: "duplicate" };
    throw new Error(error.message);
  }

  return { ok: true, breakdown, stationName: station.name };
}

/** The activity feed — newest first, voids included so the history reads true. */
export async function listActivity(limit = 50): Promise<Completion[]> {
  const { data, error } = await getSupabase()
    .from("us_completions")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as unknown as Row[]).map(toCompletion);
}

export async function listCompletionsForTeam(
  teamId: number,
  limit = 50
): Promise<Completion[]> {
  const { data, error } = await getSupabase()
    .from("us_completions")
    .select(SELECT)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as unknown as Row[]).map(toCompletion);
}

/**
 * Voids a completion without deleting it. The row stays in the ledger with its
 * reason attached, the trigger drops its points from the team's total, and the
 * partial unique index releases so the station can legitimately be re-scored.
 */
/** Returns the team it belonged to, or null when it was already void. */
export async function voidCompletion(
  id: number,
  adminId: string,
  reason: string
): Promise<number | null> {
  const { data, error } = await getSupabase()
    .from("us_completions")
    .update({
      status: "void",
      voided_at: new Date().toISOString(),
      voided_by: adminId,
      void_reason: reason || "Voided by administrator",
    })
    .eq("id", id)
    .eq("status", "valid")
    .select("team_id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? (data.team_id as number) : null;
}

/** Totals for the admin overview, in one round trip each. */
export async function getActivityCounts(): Promise<{ valid: number; voided: number }> {
  const db = getSupabase();

  const [valid, voided] = await Promise.all([
    db.from("us_completions").select("id", { count: "exact", head: true }).eq("status", "valid"),
    db.from("us_completions").select("id", { count: "exact", head: true }).eq("status", "void"),
  ]);

  return { valid: valid.count ?? 0, voided: voided.count ?? 0 };
}
