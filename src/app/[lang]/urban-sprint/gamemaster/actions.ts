"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/urban-sprint/auth";
import { claimTeam, drawBooster, getTeamForGamemaster } from "@/lib/urban-sprint/teams-db";
import { completeStation } from "@/lib/urban-sprint/completions-db";
import { createStation } from "@/lib/urban-sprint/stations-db";
import type { ScoreBreakdown } from "@/lib/urban-sprint/types";

/**
 * Row ids arrive as form fields. Number(null) is 0 and Number.isInteger(0) is
 * true, so an absent field would sail through a plain isInteger check — this
 * insists on a positive integer instead.
 */
function rowId(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (raw === null) return null;

  const value = Number(String(raw).trim());
  return Number.isInteger(value) && value > 0 ? value : null;
}

/**
 * Every action here re-checks the role and re-derives the team from the
 * session. Server Actions accept direct POSTs, so nothing trusts the form it
 * came from: a team id in the request body is never used to decide *which*
 * team is being scored — that comes from whichever team this gamemaster has
 * claimed.
 */

const GAMEMASTER = "/urban-sprint/gamemaster";

/** Revalidates everything a score change is visible in. */
function revalidateRace() {
  revalidatePath(GAMEMASTER);
  revalidatePath(`${GAMEMASTER}/stations`);
  revalidatePath("/urban-sprint/gamemaster/leaderboard");
  revalidatePath("/urban-sprint/team");
  revalidatePath("/urban-sprint/team/shops");
  revalidatePath("/urban-sprint/team/leaderboard");
  revalidatePath("/urban-sprint/leaderboard");
  revalidatePath("/urban-sprint");
  revalidatePath("/urban-sprint/admin");
  revalidatePath("/urban-sprint/admin/activity");
}

export async function claimTeamAction(formData: FormData) {
  const session = await requireRole("gamemaster");
  const teamId = rowId(formData, "teamId");

  if (teamId === null) redirect(`${GAMEMASTER}?error=missing`);

  const result = await claimTeam(teamId, session.userId);

  if (!result.ok) redirect(`${GAMEMASTER}?error=${result.reason}`);

  revalidateRace();
  // Straight on to the draw — the flow is claim, then booster, with nothing
  // in between to tap through.
  redirect(`${GAMEMASTER}?claimed=1`);
}

/**
 * Draws the team's booster. The randomness and the write both happen in
 * teams-db.drawBooster(), conditional on the team not already having one, so
 * this cannot be turned into a redraw by resubmitting.
 */
export async function drawBoosterAction() {
  const session = await requireRole("gamemaster");
  const team = await getTeamForGamemaster(session.userId);

  if (!team) redirect(`${GAMEMASTER}?error=noteam`);

  const result = await drawBooster(team.id);

  if (!result.ok) redirect(`${GAMEMASTER}?error=noboosters`);

  revalidateRace();
  // `drawn=1` only plays the reveal for the draw that actually happened; a
  // repeat submission lands on the dashboard with the booster it already had.
  redirect(`${GAMEMASTER}?${result.alreadyDrawn ? "already=1" : "drawn=1"}`);
}

export type CompleteState =
  | { status: "idle" }
  | { status: "ok"; stationId: number; stationName: string; breakdown: ScoreBreakdown }
  | { status: "error"; message: string };

const COMPLETE_ERRORS: Record<string, string> = {
  duplicate: "Your team has already completed that station.",
  "station-missing": "That station no longer exists.",
  "station-inactive": "That station has been taken out of play.",
  "team-missing": "Your team could not be found.",
};

/**
 * Confirms a station for the gamemaster's own team.
 *
 * The award is computed inside completeStation() from the station and booster
 * rows as they stand — the client sends a station id and nothing else, so the
 * score breakdown it displayed is a preview, never an input. Returning the
 * server's own breakdown is what the success screen shows.
 */
export async function completeStationAction(
  _prev: CompleteState,
  formData: FormData
): Promise<CompleteState> {
  const session = await requireRole("gamemaster");
  const stationId = rowId(formData, "stationId");

  if (stationId === null) {
    return { status: "error", message: "That station could not be identified." };
  }

  const team = await getTeamForGamemaster(session.userId);
  if (!team) return { status: "error", message: "Claim a team before confirming stations." };

  if (!team.booster) {
    return { status: "error", message: "Draw your team's booster before confirming stations." };
  }

  const result = await completeStation(team.id, stationId, session.userId);

  if (!result.ok) {
    return { status: "error", message: COMPLETE_ERRORS[result.reason] ?? "That didn't go through." };
  }

  revalidateRace();

  return {
    status: "ok",
    stationId,
    stationName: result.stationName,
    breakdown: result.breakdown,
  };
}

export type QuickStationState = { status: "idle" } | { status: "ok" } | { status: "error"; message: string };

/**
 * Lets a gamemaster add a shop they've found in the field. Base points come
 * from the campaign default rather than the form — pricing a station is an
 * organiser decision, and asking for it here would be one more thing to type
 * on a pavement.
 */
export async function createStationAction(
  _prev: QuickStationState,
  formData: FormData
): Promise<QuickStationState> {
  const session = await requireRole("gamemaster");

  const name = String(formData.get("name") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const categoryId = rowId(formData, "categoryId");
  const address = String(formData.get("address") ?? "").trim();

  if (!name) return { status: "error", message: "Give the station a name." };
  if (categoryId === null) {
    return { status: "error", message: "Pick a category." };
  }

  try {
    await createStation({
      name,
      businessName: businessName || name,
      categoryId,
      address,
      instructions: "",
      active: true,
      createdBy: session.userId,
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not add that station.",
    };
  }

  revalidateRace();
  return { status: "ok" };
}
