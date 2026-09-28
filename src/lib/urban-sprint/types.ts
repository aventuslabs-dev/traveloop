/**
 * Shared shapes for the Urban Sprint extension.
 *
 * Numeric columns come back from PostgREST as JSON numbers, but the DB type is
 * `numeric` — every read path coerces with Number() rather than trusting that,
 * so a driver change can't silently turn points into string concatenation.
 */

/** Who signs in. Racers don't: they follow their team from its private link (team-link.ts). */
export const URBAN_SPRINT_ROLES = ["admin", "gamemaster"] as const;
export type UrbanSprintRole = (typeof URBAN_SPRINT_ROLES)[number];

export const EVENT_STATUSES = ["upcoming", "live", "paused", "ended"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export type Settings = {
  eventName: string;
  eventTagline: string;
  eventStatus: EventStatus;
  eventStartsAt: string | null;
  eventLocation: string;
  defaultBasePoints: number;
  revision: number;
  /** Shown before payment and in every confirmation email. Plain text; [label](/path) links allowed. */
  rulesText: string;
  /** The "I have read and understand" declaration. Plain text; [label](/path) links allowed. */
  consentText: string;
  /** Changes whenever consentText does, and is recorded on each booking. */
  consentVersion: string;
  /** Most teams the public results board may show; 0 means all of them. */
  leaderboardLimit: number;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  color: string;
  sortOrder: number;
};

export type Booster = {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  bonusPercent: number;
  description: string;
  active: boolean;
};

export type Station = {
  id: number;
  name: string;
  businessName: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  address: string;
  instructions: string;
  basePoints: number;
  active: boolean;
  createdAt: string;
};

/** A station as the gamemaster sees it: priced for *their* team, right now. */
export type StationForTeam = Station & {
  completed: boolean;
  completedAt: string | null;
  /** What completing it would award this team, booster included. */
  projected: ScoreBreakdown;
};

export type ScoreBreakdown = {
  basePoints: number;
  boosterApplied: boolean;
  boosterName: string;
  bonusPercent: number;
  bonusPoints: number;
  totalPoints: number;
};

export type Team = {
  id: number;
  name: string;
  slug: string;
  color: string;
  gamemasterId: string | null;
  gamemasterName: string | null;
  claimedAt: string | null;
  booster: Booster | null;
  boosterDrawnAt: string | null;
  points: number;
  stationsCompleted: number;
  active: boolean;
  /** The race clock (race-clock.ts): started by the gamemaster, stopped by Finish or at 180 minutes. */
  raceStartedAt: string | null;
  raceFinishedAt: string | null;
};

export type CompletionStatus = "valid" | "void";

export type Completion = {
  id: number;
  teamId: number;
  teamName: string;
  teamColor: string;
  stationId: number;
  stationName: string;
  categoryName: string;
  gamemasterId: string | null;
  gamemasterName: string;
  basePoints: number;
  boosterName: string;
  bonusPercent: number;
  bonusPoints: number;
  boosterApplied: boolean;
  totalPoints: number;
  status: CompletionStatus;
  voidReason: string | null;
  createdAt: string;
};

export type UrbanSprintUser = {
  userId: string;
  email: string;
  role: UrbanSprintRole;
  displayName: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
  /** The team they're running, for a gamemaster who has claimed one. */
  teamId: number | null;
  teamName: string | null;
  /** The Traveloop operator's login — shown, but not editable here. */
  isOperator: boolean;
};
