import Link from "next/link";
import { getLeaderboard } from "@/lib/urban-sprint/leaderboard-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { listTeams } from "@/lib/urban-sprint/teams-db";
import { percent, points } from "@/lib/urban-sprint/format";
import Leaderboard from "../../_components/Leaderboard";
import LiveRefresh from "../../_components/LiveRefresh";
import { LivePill } from "../../_components/ui";
import { AdminHead, Panel } from "../ui";

/**
 * The organiser's view of the same board the public sees, plus the operational
 * detail the public board leaves out: who's running each team and whether
 * they've drawn yet.
 */
export default async function AdminLeaderboardPage() {
  const [board, teams, settings] = await Promise.all([
    getLeaderboard(),
    listTeams(),
    getSettings(),
  ]);

  const teamById = new Map(teams.map((team) => [team.id, team]));
  const undrawn = teams.filter((team) => team.gamemasterId && !team.booster);

  return (
    <>
      <LiveRefresh revision={settings.revision} intervalMs={4000} />

      <AdminHead
        title="Leaderboard"
        note="Ranked by the same SQL view the public board reads, so the two can never disagree."
        actions={
          <Link className="us-btn us-btn-ghost us-btn-sm" href="/urban-sprint/leaderboard" target="_blank">
            Public board
          </Link>
        }
      />

      {undrawn.length > 0 && (
        <p className="us-flash us-flash-info">
          {undrawn.map((team) => team.name).join(", ")}{" "}
          {undrawn.length === 1 ? "has" : "have"} a gamemaster but no booster yet.
        </p>
      )}

      <Panel title="Standings" count={board.length} actions={<LivePill />}>
        <Leaderboard rows={board} />
      </Panel>

      <Panel title="Team detail" flush>
        <div className="us-tablewrap">
          <table className="us-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Gamemaster</th>
                <th>Booster</th>
                <th>Stations</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {board.map((row) => {
                const team = teamById.get(row.id);

                return (
                  <tr key={row.id}>
                    <td className="us-strong">{row.rank}</td>
                    <td>
                      <span className="us-teamdot" style={{ background: row.color }} aria-hidden />
                      {row.name}
                    </td>
                    <td>{team?.gamemasterName ?? <span className="us-dim">Unclaimed</span>}</td>
                    <td>
                      {row.boosterName ? (
                        <>
                          <span className="us-tablename">{row.boosterName}</span>
                          <span className="us-tablesub">
                            {row.boosterCategory} · +{percent(row.bonusPercent ?? 0)}
                          </span>
                        </>
                      ) : (
                        <span className="us-dim">Not drawn</span>
                      )}
                    </td>
                    <td>{row.stationsCompleted}</td>
                    <td className="us-strong">{points(row.points)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
