import Link from "next/link";
import { Icon } from "@/app/components/Icons";
import { formatBookingDate, formatSlotTime } from "@/lib/urban-sprint/booking-config";
import { getActivityCounts } from "@/lib/urban-sprint/completions-db";
import { formatDuration, points } from "@/lib/urban-sprint/format";
import { RACE_MINUTES } from "@/lib/urban-sprint/race-clock";
import { getBoard } from "@/lib/urban-sprint/results-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import LiveRefresh from "../../_components/LiveRefresh";
import RaceTimer from "../../_components/RaceTimer";
import {
  EmptyState,
  LiveBadge,
  PageHeader,
  Panel,
  Pill,
  RankBadge,
  StatGrid,
  Swatch,
  bookingHref,
} from "../ui";

/**
 * The leaderboard — the same board the public page, the team pages and the
 * gamemasters see (results-db.getBoard): every team, whatever day it raced,
 * by points then time. Teams on the course right now are on it live.
 */
export default async function AdminLeaderboardPage() {
  const [board, settings, activity] = await Promise.all([
    getBoard(),
    getSettings(),
    getActivityCounts(),
  ]);

  const racing = board.filter((row) => row.racing);

  return (
    <>
      <LiveRefresh revision={settings.revision} intervalMs={4000} />

      <PageHeader
        title="Leaderboard"
        subtitle={`Every team, whatever day it raced — most points first, then the shorter time. Each race is ${RACE_MINUTES} minutes.`}
        actions={
          <Link className="ad-btn" href="/urban-sprint#leaderboard" target="_blank">
            <Icon name="external" />
            Public board
          </Link>
        }
      />

      <StatGrid
        stats={[
          { label: "Teams on the board", value: board.length },
          { label: "Racing now", value: racing.length },
          {
            label: "Stations cleared",
            value: activity.valid,
            note: activity.voided > 0 ? `${activity.voided} voided` : "none voided",
          },
          { label: "Top score", value: board[0] ? points(board[0].points) : "—" },
        ]}
      />

      <Panel title="Standings" icon="table" count={String(board.length)} padded={false} actions={<LiveBadge />}>
        {board.length === 0 ? (
          <EmptyState icon="table" title="No teams on the board yet">
            A team joins the moment its gamemaster starts the race.
          </EmptyState>
        ) : (
          <div className="ad-table-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>Race</th>
                  <th className="is-num">Racers</th>
                  <th>Status</th>
                  <th className="is-num">Points</th>
                  <th className="is-num">Time</th>
                </tr>
              </thead>
              <tbody>
                {board.map((row) => (
                  <tr key={row.reference}>
                    <td>
                      <RankBadge rank={row.rank} />
                    </td>
                    <td>
                      <span className="ad-cell-stack">
                        <span className="usc-name">
                          {row.color && <Swatch color={row.color} />}
                          <Link className="ad-link" href={bookingHref(row.reference)}>
                            {row.teamName}
                          </Link>
                        </span>
                        <span>{row.reference}</span>
                      </span>
                    </td>
                    <td>
                      <span className="ad-cell-stack">
                        <b>{formatBookingDate(row.date)}</b>
                        <span>{formatSlotTime(row.time)}</span>
                      </span>
                    </td>
                    <td className="is-num">{row.teamSize}</td>
                    <td>
                      <Pill label={row.racing ? "Racing" : "Finished"} tone={row.racing ? "info" : "success"} />
                    </td>
                    <td className="is-num is-strong">{points(row.points)}</td>
                    <td className="is-num">
                      {row.racing && row.startedAt ? (
                        <RaceTimer startedAt={row.startedAt} />
                      ) : (
                        formatDuration(row.seconds)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
