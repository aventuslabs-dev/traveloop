import { NextResponse } from "next/server";
import { getRevision } from "@/lib/urban-sprint/settings-db";

/**
 * The live-update heartbeat.
 *
 * Every scoring-relevant write bumps us_settings.revision by trigger. Open
 * tabs poll this, and refresh only when the number they hold has moved — so a
 * quiet minute costs one primary-key read per tab and no re-render, while a
 * station completion reaches every open leaderboard within a tick.
 *
 * It's deliberately a plain JSON endpoint rather than a socket: Supabase
 * Realtime would need the anon key and URL published to the browser, which
 * this project has so far kept server-side. Swapping the transport later means
 * changing LiveRefresh.tsx alone — nothing else knows how updates arrive.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const revision = await getRevision();

  return NextResponse.json(
    { revision },
    { headers: { "cache-control": "no-store, max-age=0" } }
  );
}
