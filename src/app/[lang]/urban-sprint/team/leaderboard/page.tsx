import Link from "next/link";
import { requireRole } from "@/lib/urban-sprint/auth";
import { getLeaderboard } from "@/lib/urban-sprint/leaderboard-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { getTeamForParticipant } from "@/lib/urban-sprint/teams-db";
import { ordinal, points } from "@/lib/urban-sprint/format";
import AppBar from "../../_components/AppBar";
import Leaderboard from "../../_components/Leaderboard";
import LiveRefresh from "../../_components/LiveRefresh";
import TabBar from "../../_components/TabBar";
import { LivePill } from "../../_components/ui";
import { PARTICIPANT_TABS } from "../../_components/tabs";

/**
 * The board inside the participant shell, so the bottom navigation survives
 * the trip. A participant with no team yet still gets the standings — they
 * just don't get a row highlighted.
 */
export default async function ParticipantLeaderboardPage() {
  const session = await requireRole("participant");

  const [team, board, settings] = await Promise.all([
    getTeamForParticipant(session.userId),
    getLeaderboard(),
    getSettings(),
  ]);

  const mine = team ? board.find((row) => row.id === team.id) : undefined;

  return (
    <>
      <LiveRefresh revision={settings.revision} intervalMs={5000} />

      <AppBar
        title="Leaderboard"
        subtitle={team ? `${team.name} · ${points(team.points)} pts` : "Urban Sprint"}
        accent={team?.color}
      />

      <div className="us-page has-tabs">
        {team && (
          <section className="us-score" style={{ "--team": team.color } as React.CSSProperties}>
            <p className="us-score-label">
              Your position <LivePill />
            </p>
            <p className="us-score-value">{mine ? ordinal(mine.rank) : "—"}</p>
            <div className="us-score-meta">
              <span>
                of <b>{board.length}</b> teams
              </span>
              <span>
                <b>{points(team.points)}</b> points
              </span>
              <span>
                <b>{team.stationsCompleted}</b> stations
              </span>
            </div>
          </section>
        )}

        <Leaderboard rows={board} highlightTeamId={team?.id ?? null} />

        <Link className="us-btn us-btn-ghost us-btn-block" href="/urban-sprint/leaderboard" target="_blank">
          Open the public board
        </Link>
      </div>

      <TabBar tabs={PARTICIPANT_TABS} />
    </>
  );
}
