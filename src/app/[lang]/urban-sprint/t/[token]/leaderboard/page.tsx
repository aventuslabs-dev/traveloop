import Link from "next/link";
import { formatBookingDate } from "@/lib/urban-sprint/booking-config";
import { getBoard } from "@/lib/urban-sprint/results-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { ordinal, points } from "@/lib/urban-sprint/format";
import AppBar from "../../../_components/AppBar";
import ResultsBoard from "../../../_components/ResultsBoard";
import LiveRefresh from "../../../_components/LiveRefresh";
import TabBar from "../../../_components/TabBar";
import { Empty, LivePill } from "../../../_components/ui";
import { teamLinkTabs } from "../../../_components/tabs";
import { loadTeamLink } from "../load";

/**
 * The leaderboard inside the team's own pages, so the bottom navigation
 * survives the trip. Every team, whatever day it raced, by points then time.
 */
export default async function TeamLinkLeaderboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [{ base, booking, team, color }, board, settings] = await Promise.all([
    loadTeamLink((await params).token),
    getBoard(),
    getSettings(),
  ]);

  const mine = board.find((row) => row.reference === booking.reference);

  return (
    <>
      <LiveRefresh revision={settings.revision} intervalMs={5000} />

      <AppBar
        title="Leaderboard"
        subtitle={team ? `${booking.teamName} · ${points(team.points)} pts` : booking.teamName}
        accent={team?.color}
        signOut={false}
      />

      <div className="us-page has-tabs">
        {mine ? (
          <section className="us-score" style={{ "--team": color } as React.CSSProperties}>
            <p className="us-score-label">
              Your position {mine.racing && <LivePill label="Racing" />}
            </p>
            <p className="us-score-value">{ordinal(mine.rank)}</p>
            <div className="us-score-meta">
              <span>
                of <b>{board.length}</b> teams
              </span>
              <span>
                <b>{points(mine.points)}</b> points
              </span>
            </div>
          </section>
        ) : (
          <Empty title={`You race on ${formatBookingDate(booking.date)}`}>
            Every team that has raced is on this board, ranked by points then time. Yours joins it
            the moment your race starts.
          </Empty>
        )}

        <ResultsBoard rows={board} highlightReference={booking.reference} />

        <Link className="us-btn us-btn-ghost us-btn-block" href="/urban-sprint#leaderboard" target="_blank">
          All race results
        </Link>
      </div>

      <TabBar tabs={teamLinkTabs(base)} />
    </>
  );
}
