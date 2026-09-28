import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/urban-sprint/auth";
import { getBoard } from "@/lib/urban-sprint/results-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { listStationsForTeam } from "@/lib/urban-sprint/stations-db";
import { bookingReferenceForTeam, getTeamForGamemaster } from "@/lib/urban-sprint/teams-db";
import { ordinal, points } from "@/lib/urban-sprint/format";
import AppBar from "../../_components/AppBar";
import ResultsBoard from "../../_components/ResultsBoard";
import LiveRefresh from "../../_components/LiveRefresh";
import TabBar from "../../_components/TabBar";
import { LivePill } from "../../_components/ui";
import { gamemasterTabs } from "../../_components/tabs";

/**
 * The board as the gamemaster sees it — the same standings as the public page,
 * but inside their own shell so the bottom navigation stays under their thumb,
 * and with their team picked out of the list.
 */
export default async function GamemasterLeaderboardPage() {
  const session = await requireRole("gamemaster");
  const team = await getTeamForGamemaster(session.userId);

  if (!team) redirect("/urban-sprint/gamemaster");

  const [board, settings, stations] = await Promise.all([
    getBoard(),
    getSettings(),
    listStationsForTeam(team.id, team.booster),
  ]);

  const reference = bookingReferenceForTeam(team);
  const mine = board.find((row) => row.reference === reference);
  const remaining = stations.filter((station) => !station.completed).length;

  return (
    <>
      <LiveRefresh revision={settings.revision} intervalMs={4000} />

      <AppBar
        title="Leaderboard"
        subtitle={`${team.name} · ${points(team.points)} pts`}
        accent={team.color}
      />

      <div className="us-page has-tabs">
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

        <ResultsBoard rows={board} highlightReference={reference} />

        <Link className="us-btn us-btn-ghost us-btn-block" href="/urban-sprint#leaderboard" target="_blank">
          Open the public board
        </Link>
      </div>

      <TabBar tabs={gamemasterTabs(remaining)} />
    </>
  );
}
