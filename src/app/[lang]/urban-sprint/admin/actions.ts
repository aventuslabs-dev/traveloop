"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/urban-sprint/auth";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/urban-sprint/categories-db";
import { createBooster, deleteBooster, updateBooster } from "@/lib/urban-sprint/boosters-db";
import { createStation, deleteStation, updateStation } from "@/lib/urban-sprint/stations-db";
import {
  createTeam,
  deleteTeam,
  releaseTeam,
  updateTeam,
} from "@/lib/urban-sprint/teams-db";
import { voidCompletion } from "@/lib/urban-sprint/completions-db";
import { recordRaceResult } from "@/lib/urban-sprint/race-db";
import { updateSettings } from "@/lib/urban-sprint/settings-db";
import {
  clearBookingResult,
  getBookingByReference,
  setBookingResult,
} from "@/lib/urban-sprint/bookings-db";
import { normalizeBookingId } from "@/lib/urban-sprint/booking-config";
import { parseDuration } from "@/lib/urban-sprint/format";
import {
  createUrbanSprintUser,
  deleteUrbanSprintUser,
  setUserPassword,
  updateUrbanSprintUser,
} from "@/lib/urban-sprint/users-db";
import { URBAN_SPRINT_ROLES, type EventStatus, type UrbanSprintRole } from "@/lib/urban-sprint/types";

/**
 * Admin mutations.
 *
 * Every one starts with requireRole("admin") — Server Actions are reachable by
 * direct POST, so the rendering page having been admin-only is not evidence
 * about the request that arrives here.
 *
 * The forms are plain <form action={...}> with a redirect back carrying a
 * flash message, so the console works without client JavaScript and each
 * screen stays a Server Component.
 */

const ADMIN = "/urban-sprint/admin";
const SETTINGS = `${ADMIN}/settings`;

/** Refreshes every surface a change can be visible in. */
function revalidateAll() {
  for (const path of [
    ADMIN,
    `${ADMIN}/bookings`,
    `${ADMIN}/results`,
    `${ADMIN}/users`,
    `${ADMIN}/teams`,
    `${ADMIN}/stations`,
    `${ADMIN}/categories`,
    `${ADMIN}/boosters`,
    `${ADMIN}/activity`,
    `${ADMIN}/leaderboard`,
    SETTINGS,
    "/urban-sprint",
    "/urban-sprint/gamemaster",
    "/urban-sprint/gamemaster/stations",
    "/urban-sprint/gamemaster/leaderboard",
  ]) {
    revalidatePath(path);
  }
}

function back(path: string, message: string, tone: "ok" | "err" = "ok"): never {
  // A path may carry its own query (a search being worked through); the
  // flash joins it rather than replacing it.
  const url = new URL(path, "http://console.local");
  url.searchParams.set("tone", tone);
  url.searchParams.set("msg", message);
  redirect(`${url.pathname}${url.search}`);
}

/**
 * Where a form asked to be sent back to. Only somewhere inside this console
 * — a posted value is not trusted to name an arbitrary destination — and
 * without the previous flash, which back() is about to replace.
 */
function returnPath(formData: FormData, fallback: string): string {
  const raw = String(formData.get("returnTo") ?? "");
  if (!raw.startsWith(`${ADMIN}/`) && raw !== ADMIN) return fallback;
  if (raw.includes("//") || raw.includes("\\")) return fallback;

  const url = new URL(raw, "http://console.local");
  url.searchParams.delete("tone");
  url.searchParams.delete("msg");
  return `${url.pathname}${url.search}`;
}

/**
 * Runs a mutation and turns a thrown error into a flash rather than an error
 * page — "that category is still in use" is information, not a crash.
 * `redirect` throws by design, so it is called outside the try.
 */
async function run(path: string, ok: string, work: () => Promise<void>): Promise<never> {
  let failure: string | null = null;

  try {
    await work();
  } catch (error) {
    failure = error instanceof Error ? error.message : "Something went wrong.";
  }

  if (failure) back(path, failure, "err");

  revalidateAll();
  back(path, ok);
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Reads a numeric field, or null when it is absent, blank or not a number.
 *
 * Deliberately not "fall back to a default": Number(null) is 0 and passes
 * isFinite, so a fallback never fires for a *missing* field, and a malformed
 * POST would silently write 0 into a station's base points or a booster's
 * bonus percent. Scoring configuration has to fail loudly rather than quietly
 * become zero, so callers that need a value go through numbers() below and the
 * genuinely optional ones spell out their own default with `?? n`.
 */
function number(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (raw === null) return null;

  const trimmed = String(raw).trim();
  if (trimmed === "") return null;

  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** Rejects the whole submission if a required number did not come through. */
function numbers<K extends string>(
  path: string,
  fields: Record<K, number | null>
): Record<K, number> {
  for (const [key, value] of Object.entries(fields) as [K, number | null][]) {
    if (value === null) back(path, "That form was missing a valid " + key + ".", "err");
  }
  return fields as Record<K, number>;
}

function checked(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

/* --------------------------------- Settings -------------------------------- */

export async function updateSettingsAction(formData: FormData) {
  await requireRole("admin");
  const { defaultBasePoints } = numbers(SETTINGS, {
    defaultBasePoints: number(formData, "defaultBasePoints"),
  });

  return run(SETTINGS, "Event settings saved.", () =>
    updateSettings({
      eventName: text(formData, "eventName"),
      eventTagline: text(formData, "eventTagline"),
      eventStatus: text(formData, "eventStatus") as EventStatus,
      eventLocation: text(formData, "eventLocation"),
      defaultBasePoints,
    })
  );
}

/* -------------------------------- Categories ------------------------------- */

export async function createCategoryAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/categories`;

  return run(path, "Category added.", () =>
    createCategory({
      name: text(formData, "name"),
      color: text(formData, "color") || "#7c5cff",
      sortOrder: number(formData, "sortOrder") ?? 0,
    })
  );
}

export async function updateCategoryAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/categories`;
  const { id } = numbers(path, { id: number(formData, "id") });

  return run(path, "Category updated.", () =>
    updateCategory(id, {
      name: text(formData, "name"),
      color: text(formData, "color"),
      sortOrder: number(formData, "sortOrder") ?? 0,
    })
  );
}

export async function deleteCategoryAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/categories`;
  const { id } = numbers(path, { id: number(formData, "id") });

  return run(path, "Category deleted.", () => deleteCategory(id));
}

/* --------------------------------- Boosters -------------------------------- */

export async function createBoosterAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/boosters`;
  const { categoryId, bonusPercent } = numbers(path, {
    categoryId: number(formData, "categoryId"),
    bonusPercent: number(formData, "bonusPercent"),
  });

  return run(path, "Booster added.", () =>
    createBooster({
      name: text(formData, "name"),
      categoryId,
      bonusPercent,
      description: text(formData, "description"),
      active: checked(formData, "active"),
    })
  );
}

export async function updateBoosterAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/boosters`;
  const { id, categoryId, bonusPercent } = numbers(path, {
    id: number(formData, "id"),
    categoryId: number(formData, "categoryId"),
    bonusPercent: number(formData, "bonusPercent"),
  });

  return run(path, "Booster updated.", () =>
    updateBooster(id, {
      name: text(formData, "name"),
      categoryId,
      bonusPercent,
      description: text(formData, "description"),
      active: checked(formData, "active"),
    })
  );
}

export async function deleteBoosterAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/boosters`;
  const { id } = numbers(path, { id: number(formData, "id") });

  return run(path, "Booster deleted.", () => deleteBooster(id));
}

/* --------------------------------- Stations -------------------------------- */

export async function createStationAction(formData: FormData) {
  const session = await requireRole("admin");
  const path = `${ADMIN}/stations`;
  const { categoryId, basePoints } = numbers(path, {
    categoryId: number(formData, "categoryId"),
    basePoints: number(formData, "basePoints"),
  });

  return run(path, "Station added.", () =>
    createStation({
      name: text(formData, "name"),
      businessName: text(formData, "businessName") || text(formData, "name"),
      categoryId,
      address: text(formData, "address"),
      instructions: text(formData, "instructions"),
      basePoints,
      active: checked(formData, "active"),
      createdBy: session.userId,
    })
  );
}

export async function updateStationAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/stations`;
  const { id, categoryId, basePoints } = numbers(path, {
    id: number(formData, "id"),
    categoryId: number(formData, "categoryId"),
    basePoints: number(formData, "basePoints"),
  });

  return run(path, "Station updated.", () =>
    updateStation(id, {
      name: text(formData, "name"),
      businessName: text(formData, "businessName"),
      categoryId,
      address: text(formData, "address"),
      instructions: text(formData, "instructions"),
      basePoints,
      active: checked(formData, "active"),
    })
  );
}

export async function deleteStationAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/stations`;
  const { id } = numbers(path, { id: number(formData, "id") });

  return run(path, "Station deleted.", () => deleteStation(id));
}

/* ---------------------------------- Teams ---------------------------------- */

export async function createTeamAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/teams`;

  return run(path, "Team added.", () =>
    createTeam({
      name: text(formData, "name"),
      color: text(formData, "color") || "#ff5c38",
      active: checked(formData, "active"),
    })
  );
}

export async function updateTeamAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/teams`;
  const { id } = numbers(path, { id: number(formData, "id") });

  return run(path, "Team updated.", () =>
    updateTeam(id, {
      name: text(formData, "name"),
      color: text(formData, "color"),
      active: checked(formData, "active"),
    })
  );
}

export async function deleteTeamAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/teams`;
  const { id } = numbers(path, { id: number(formData, "id") });

  return run(path, "Team deleted.", () => deleteTeam(id));
}

/**
 * Hands a claimed team back to the pool. The booster is deliberately left
 * alone: a replacement gamemaster inherits the team as it stands, and clearing
 * it here would be a redraw by another name.
 */
export async function releaseTeamAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/teams`;
  const { id } = numbers(path, { id: number(formData, "id") });

  return run(path, "Team released — another gamemaster can claim it.", () => releaseTeam(id));
}

/* ---------------------------------- Users ---------------------------------- */

/** Only the roles that sign in; racers follow their team from its link instead. */
function roleFrom(formData: FormData, path: string): UrbanSprintRole {
  const role = text(formData, "role");
  if (!(URBAN_SPRINT_ROLES as readonly string[]).includes(role)) {
    back(path, "Choose admin or gamemaster.", "err");
  }
  return role as UrbanSprintRole;
}

export async function createUserAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/users`;

  const email = text(formData, "email");
  const password = text(formData, "password");
  const role = roleFrom(formData, path);
  const displayName = text(formData, "displayName");

  if (!email || !password) back(path, "Email and password are both required.", "err");
  if (password.length < 8) back(path, "Use a password of at least 8 characters.", "err");

  const result = await createUrbanSprintUser({
    email,
    password,
    role,
    displayName: displayName || email.split("@")[0],
    phone: text(formData, "phone") || null,
  });

  if (!result.ok) back(path, result.error, "err");

  revalidateAll();
  back(path, `${displayName || email} added as ${role}.`);
}

export async function updateUserAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/users`;
  const userId = text(formData, "userId");
  const role = roleFrom(formData, path);

  return run(path, "Account updated.", async () => {
    await updateUrbanSprintUser(userId, {
      role,
      displayName: text(formData, "displayName"),
      phone: text(formData, "phone") || null,
      active: checked(formData, "active"),
    });
  });
}

export async function setPasswordAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/users`;
  const password = text(formData, "password");

  if (password.length < 8) back(path, "Use a password of at least 8 characters.", "err");

  return run(path, "Password reset.", () => setUserPassword(text(formData, "userId"), password));
}

export async function deleteUserAction(formData: FormData) {
  const session = await requireRole("admin");
  const path = `${ADMIN}/users`;
  const userId = text(formData, "userId");

  // Deleting your own account would sign you out of the console you're
  // standing in, and could leave the campaign with no administrator at all.
  if (userId === session.userId) back(path, "You can't delete your own account.", "err");

  return run(path, "Account deleted.", () => deleteUrbanSprintUser(userId));
}

/* ------------------------------- Completions ------------------------------- */

/**
 * Voids a completion. The row stays in the ledger with the reason attached and
 * the team total is recomputed by trigger — nothing is deleted, so the history
 * still shows that it happened and that it was reversed.
 */
export async function voidCompletionAction(formData: FormData) {
  const session = await requireRole("admin");
  const path = `${ADMIN}/activity`;
  const { id } = numbers(path, { id: number(formData, "id") });

  return run(path, "Completion voided and points removed.", async () => {
    const teamId = await voidCompletion(id, session.userId, text(formData, "reason"));
    // A team that has already finished carries its points on the board as a
    // result; bring that result into line with the corrected total.
    if (teamId !== null) await recordRaceResult(teamId, session.userId);
  });
}

/* ------------------------------ Booking wording ----------------------------- */

/**
 * The wording Traveloop is still finalising: the Rules & Regulations (booking
 * page and confirmation email), the declaration ticked before payment, and how
 * many teams the public results board shows.
 */
export async function updateWordingAction(formData: FormData) {
  await requireRole("admin");

  // Textareas post CRLF line breaks; store plain ones.
  const multiline = (key: string) =>
    String(formData.get(key) ?? "")
      .replace(/\r\n/g, "\n")
      .trim();
  const rulesText = multiline("rulesText");
  const consentText = multiline("consentText");
  const limit = number(formData, "leaderboardLimit");

  if (!consentText) back(SETTINGS, "The declaration can't be empty — buyers have to have something to agree to.", "err");
  if (!rulesText) back(SETTINGS, "The Rules & Regulations can't be empty.", "err");
  if (limit === null || !Number.isInteger(limit) || limit < 0) {
    back(SETTINGS, "The leaderboard limit has to be a whole number (0 for all teams).", "err");
  }

  return run(SETTINGS, "Booking wording saved.", () =>
    updateSettings({ rulesText, consentText, leaderboardLimit: limit })
  );
}

/* --------------------------------- Results --------------------------------- */

/**
 * Enters (or corrects) a team's result against its booking. The completion
 * time is typed as it reads off a stopwatch — "58:12" or "1:02:05".
 *
 * Takes either a booking id (the edit form on a row) or a typed Booking ID
 * (the quick-entry form at the finish line). The team name is never typed:
 * it comes from the booking, so a result can't be filed under a misspelling.
 */
export async function setResultAction(formData: FormData) {
  const session = await requireRole("admin");
  const path = returnPath(formData, `${ADMIN}/bookings`);

  let bookingId = number(formData, "bookingId");
  let reference = text(formData, "reference");
  const points = number(formData, "points");
  const seconds = parseDuration(text(formData, "time"));

  if (bookingId === null) {
    const typed = normalizeBookingId(reference);
    const booking = typed ? await getBookingByReference(typed) : null;
    if (!booking) back(path, `No booking has the ID "${reference}".`, "err");
    if (booking.status !== "paid") {
      back(path, `${booking.reference} (${booking.teamName}) isn't paid, so it can't have a result.`, "err");
    }
    bookingId = booking.id;
    reference = `${booking.reference} (${booking.teamName})`;
  }

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    back(path, "That form was missing its booking.", "err");
  }
  if (points === null || points < 0 || points > 99_999_999) {
    back(path, `Enter the points for ${reference} as a number of 0 or more.`, "err");
  }
  if (seconds === null) {
    back(path, `Enter ${reference}'s completion time as minutes:seconds, e.g. 58:12, or hours:minutes:seconds.`, "err");
  }

  return run(path, `Result saved for ${reference}.`, () =>
    setBookingResult(bookingId, { points, seconds }, session.userId)
  );
}

export async function clearResultAction(formData: FormData) {
  await requireRole("admin");
  const path = returnPath(formData, `${ADMIN}/bookings`);

  const bookingId = number(formData, "bookingId");
  if (bookingId === null || !Number.isInteger(bookingId) || bookingId <= 0) {
    back(path, "That form was missing its booking.", "err");
  }

  return run(path, `Result cleared for ${text(formData, "reference")}.`, () => clearBookingResult(bookingId));
}
