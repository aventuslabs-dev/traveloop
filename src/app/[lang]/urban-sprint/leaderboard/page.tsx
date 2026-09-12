import type { Metadata } from "next";
import Link from "next/link";
import { getUrbanSprintSession, ROLE_HOME } from "@/lib/urban-sprint/auth";
import { getLeaderboard } from "@/lib/urban-sprint/leaderboard-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { getCampaignStats } from "@/lib/urban-sprint/stats-db";
import { getTeamForGamemaster, getTeamForParticipant } from "@/lib/urban-sprint/teams-db";
import { points } from "@/lib/urban-sprint/format";
import Leaderboard from "../_components/Leaderboard";
import LiveRefresh from "../_components/LiveRefresh";
import { LivePill, StatusPill, Wordmark, statusNote } from "../_components/ui";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Live standings for Urban Sprint — every team, every station, updating as it happens.",
};

/**
 * The full public board. Open to anyone, but if the viewer happens to be
 * signed in it highlights their own team, so the same URL works as the link a
 * gamemaster keeps open and as the one on a poster.
 */
export default async function UrbanSprintLeaderboardPage() {
  const session = await getUrbanSprintSession();

  const [board, settings, stats] = await Promise.all([
    getLeaderboard(),
    getSettings(),
    getCampaignStats(),
  ]);

  let myTeamId: number | null = null;
  if (session?.role === "gamemaster") {
    myTeamId = (await getTeamForGamemaster(session.userId))?.id ?? null;
  } else if (session?.role === "participant") {
    myTeamId = (await getTeamForParticipant(session.userId))?.id ?? null;
  }

  return (
    <main className="us-public">
      <LiveRefresh revision={settings.revision} intervalMs={5000} />

      <header className="us-topbar">
        <Wordmark />
        <nav className="us-topbar-nav" aria-label="Urban Sprint">
          <Link href="/urban-sprint">Overview</Link>
        </nav>
        {session ? (
          <Link className="us-btn us-btn-primary us-btn-sm" href={ROLE_HOME[session.role]}>
            Dashboard
          </Link>
        ) : (
          <Link className="us-btn us-btn-primary us-btn-sm" href="/urban-sprint/login">
            Log in
          </Link>
        )}
      </header>

      <section className="us-boardpage">
        <div className="us-shell">
          <div className="us-boardpage-head">
            <div>
              <p className="us-eyebrow">
                Leaderboard <LivePill />
              </p>
              <h1>Standings</h1>
              <p className="us-boardpage-note">
                {stats.completions} stations cleared · {points(stats.pointsAwarded)} points awarded
                across {stats.teams} teams.
              </p>
            </div>
            <div className="us-boardpage-status">
              <StatusPill status={settings.eventStatus} />
              <span>{statusNote(settings.eventStatus)}</span>
            </div>
          </div>

          <Leaderboard rows={board} highlightTeamId={myTeamId} />

          <p className="us-boardpage-foot">
            Scores are awarded server-side the moment a gamemaster confirms a station, booster bonus
            included. Voided stops are removed from the totals but kept in the organisers&rsquo;
            history.
          </p>
        </div>
      </section>
    </main>
  );
}
