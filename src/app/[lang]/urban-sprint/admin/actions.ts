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
  assignParticipantToTeam,
  createTeam,
  deleteTeam,
  releaseTeam,
  updateTeam,
} from "@/lib/urban-sprint/teams-db";
import { voidCompletion } from "@/lib/urban-sprint/completions-db";
import { updateSettings } from "@/lib/urban-sprint/settings-db";
import {
  createUrbanSprintUser,
  deleteUrbanSprintUser,
  setUserPassword,
  updateUrbanSprintUser,
} from "@/lib/urban-sprint/users-db";
import type { EventStatus, UrbanSprintRole } from "@/lib/urban-sprint/types";

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

/** Refreshes every surface a change can be visible in. */
function revalidateAll() {
  for (const path of [
    ADMIN,
    `${ADMIN}/users`,
    `${ADMIN}/teams`,
    `${ADMIN}/stations`,
    `${ADMIN}/categories`,
    `${ADMIN}/boosters`,
    `${ADMIN}/activity`,
    `${ADMIN}/leaderboard`,
    "/urban-sprint",
    "/urban-sprint/leaderboard",
    "/urban-sprint/gamemaster",
    "/urban-sprint/gamemaster/stations",
    "/urban-sprint/gamemaster/leaderboard",
    "/urban-sprint/team",
    "/urban-sprint/team/shops",
    "/urban-sprint/team/leaderboard",
  ]) {
    revalidatePath(path);
  }
}

function back(path: string, message: string, tone: "ok" | "err" = "ok"): never {
  redirect(`${path}?tone=${tone}&msg=${encodeURIComponent(message)}`);
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
  const { defaultBasePoints } = numbers(ADMIN, {
    defaultBasePoints: number(formData, "defaultBasePoints"),
  });

  return run(ADMIN, "Campaign settings saved.", () =>
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

export async function createUserAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/users`;

  const email = text(formData, "email");
  const password = text(formData, "password");
  const role = text(formData, "role") as UrbanSprintRole;
  const displayName = text(formData, "displayName");
  const teamId = text(formData, "teamId");

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

  if (role === "participant" && teamId) {
    await assignParticipantToTeam(result.userId, Number(teamId));
  }

  revalidateAll();
  back(path, `${displayName || email} added as ${role}.`);
}

export async function updateUserAction(formData: FormData) {
  await requireRole("admin");
  const path = `${ADMIN}/users`;
  const userId = text(formData, "userId");
  const role = text(formData, "role") as UrbanSprintRole;
  const teamId = text(formData, "teamId");

  return run(path, "Account updated.", async () => {
    await updateUrbanSprintUser(userId, {
      role,
      displayName: text(formData, "displayName"),
      phone: text(formData, "phone") || null,
      active: checked(formData, "active"),
    });

    // Team assignment only means anything for participants; updateUrbanSprintUser
    // has already cleared any stale membership for the other roles.
    if (role === "participant") {
      await assignParticipantToTeam(userId, teamId ? Number(teamId) : null);
    }
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

  return run(path, "Completion voided and points removed.", () =>
    voidCompletion(id, session.userId, text(formData, "reason"))
  );
}
