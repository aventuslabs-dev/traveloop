import { getSupabase } from "@/lib/supabase";
import type { EventStatus, Settings } from "./types";

const FALLBACK: Settings = {
  eventName: "Urban Sprint",
  eventTagline: "One city. Every shop. Three hours on the clock.",
  eventStatus: "upcoming",
  eventStartsAt: null,
  eventLocation: "George Town, Penang",
  defaultBasePoints: 30,
  revision: 0,
  rulesText: "Rules & Regulations will be confirmed by Traveloop before your race.",
  consentText:
    "I have read and understand the [Terms & Conditions](/terms) and [Privacy Notice](/privacy), " +
    "and I consent to Traveloop using the information submitted for marketing purposes, where applicable.",
  consentVersion: "draft-2026-09",
  leaderboardLimit: 200,
};

/**
 * The singleton settings row. Falls back to sane defaults rather than throwing
 * so the *public* landing page still renders if the table hasn't been created
 * yet — a marketing page that 500s is worse than one showing "upcoming".
 */
export async function getSettings(): Promise<Settings> {
  const { data, error } = await getSupabase()
    .from("us_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return FALLBACK;

  return {
    eventName: data.event_name,
    eventTagline: data.event_tagline,
    eventStatus: data.event_status as EventStatus,
    eventStartsAt: data.event_starts_at,
    eventLocation: data.event_location,
    defaultBasePoints: Number(data.default_base_points),
    revision: Number(data.revision),
    // The wording columns arrive with a later schema step; until it has run,
    // the defaults keep the booking form working.
    rulesText: data.rules_text ?? FALLBACK.rulesText,
    consentText: data.consent_text ?? FALLBACK.consentText,
    consentVersion: data.consent_version ?? FALLBACK.consentVersion,
    leaderboardLimit:
      data.leaderboard_limit === undefined || data.leaderboard_limit === null
        ? FALLBACK.leaderboardLimit
        : Number(data.leaderboard_limit),
  };
}

/**
 * The live-update cursor on its own. Deliberately the narrowest possible
 * query — /urban-sprint/api/pulse runs it on every open tab every few seconds,
 * so it reads one column of one row by primary key.
 */
export async function getRevision(): Promise<number> {
  const { data } = await getSupabase()
    .from("us_settings")
    .select("revision")
    .eq("id", 1)
    .maybeSingle();

  return Number(data?.revision ?? 0);
}

export async function updateSettings(patch: {
  eventName?: string;
  eventTagline?: string;
  eventStatus?: EventStatus;
  eventStartsAt?: string | null;
  eventLocation?: string;
  defaultBasePoints?: number;
  rulesText?: string;
  consentText?: string;
  leaderboardLimit?: number;
}): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (patch.eventName !== undefined) row.event_name = patch.eventName;
  if (patch.eventTagline !== undefined) row.event_tagline = patch.eventTagline;
  if (patch.eventStatus !== undefined) row.event_status = patch.eventStatus;
  if (patch.eventStartsAt !== undefined) row.event_starts_at = patch.eventStartsAt;
  if (patch.eventLocation !== undefined) row.event_location = patch.eventLocation;
  if (patch.defaultBasePoints !== undefined) {
    row.default_base_points = patch.defaultBasePoints;
  }
  if (patch.rulesText !== undefined) row.rules_text = patch.rulesText;
  if (patch.leaderboardLimit !== undefined) row.leaderboard_limit = patch.leaderboardLimit;

  // New declaration wording is a new version: bookings made from here on
  // record that they agreed to this text, not the one before it.
  if (patch.consentText !== undefined) {
    const current = await getSettings();
    if (patch.consentText !== current.consentText) {
      row.consent_text = patch.consentText;
      row.consent_version = new Date().toISOString().slice(0, 19).replace("T", " ");
    }
  }

  // us_settings is where `revision` itself lives, so it can't carry a
  // bump-the-revision trigger without recursing — the write does it inline.
  // Two admins saving at once can collide on the read-then-write, which costs
  // at most one missed refresh tick; the next change corrects it.
  row.revision = (await getRevision()) + 1;

  const { error } = await getSupabase().from("us_settings").update(row).eq("id", 1);
  if (error) throw new Error(error.message);
}
