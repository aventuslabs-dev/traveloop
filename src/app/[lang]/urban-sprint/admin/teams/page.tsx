import { listTeams } from "@/lib/urban-sprint/teams-db";
import { getLeaderboard } from "@/lib/urban-sprint/leaderboard-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { initials, ordinal, percent, points } from "@/lib/urban-sprint/format";
import LiveRefresh from "../../_components/LiveRefresh";
import {
  createTeamAction,
  deleteTeamAction,
  releaseTeamAction,
  updateTeamAction,
} from "../actions";
import { AdminFlash, AdminHead, Panel, RowEditor, Swatch } from "../ui";

/**
 * Every team, with the four things an organiser is asked about mid-race: who's
 * running it, what it drew, how far it's got, and where it sits.
 */
export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const [teams, board, settings] = await Promise.all([
    listTeams(),
    getLeaderboard(),
    getSettings(),
  ]);

  const rankOf = new Map(board.map((row) => [row.id, row.rank]));
  const claimed = teams.filter((team) => team.gamemasterId).length;

  return (
    <>
      <LiveRefresh revision={settings.revision} intervalMs={6000} />

      <AdminHead
        title="Teams"
        note={`${claimed} of ${teams.length} claimed by a gamemaster. A team is locked to its gamemaster until you release it.`}
      />

      <AdminFlash params={params} />

      <div className="us-admingrid is-narrowfirst">
        <Panel title="New team">
          <form className="us-form" action={createTeamAction}>
            <label className="us-field">
              <span>Team name</span>
              <input name="name" placeholder="Night Owls" required />
            </label>

            <label className="us-field">
              <span>Colour</span>
              <input name="color" type="color" defaultValue="#ff5c38" />
              <small>Used to tint the team&rsquo;s own screens and its leaderboard row.</small>
            </label>

            <label className="us-check">
              <input type="checkbox" name="active" defaultChecked />
              <span>Available to claim</span>
            </label>

            <button className="us-btn us-btn-primary us-btn-block" type="submit">
              Add team
            </button>
          </form>
        </Panel>

        <Panel title="All teams" count={teams.length} flush>
          {teams.length === 0 ? (
            <p className="us-panel-empty">No teams yet.</p>
          ) : (
            <div className="us-tablewrap">
              <table className="us-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Gamemaster</th>
                    <th>Booster</th>
                    <th>Squad</th>
                    <th>Stations</th>
                    <th>Points</th>
                    <th>Rank</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => {
                    const rank = rankOf.get(team.id);

                    return (
                      <tr key={team.id} className={team.active ? undefined : "is-dim"}>
                        <td>
                          <span className="us-tablename">
                            <Swatch color={team.color} />
                            {team.name}
                          </span>
                          {!team.active && <span className="us-tablesub">Inactive</span>}
                        </td>

                        <td>
                          {team.gamemasterName ? (
                            <span className="us-pill us-pill-accent">{team.gamemasterName}</span>
                          ) : (
                            <span className="us-pill us-pill-neutral">Unclaimed</span>
                          )}
                        </td>

                        <td>
                          {team.booster ? (
                            <>
                              <span className="us-tablename">{team.booster.name}</span>
                              <span className="us-tablesub">
                                {team.booster.categoryName} · +{percent(team.booster.bonusPercent)}
                              </span>
                            </>
                          ) : (
                            <span className="us-dim">Not drawn</span>
                          )}
                        </td>

                        <td>
                          {team.members.length === 0 ? (
                            <span className="us-dim">—</span>
                          ) : (
                            <span className="us-avatars is-sm">
                              {team.members.slice(0, 4).map((member) => (
                                <i key={member.userId} title={member.displayName}>
                                  {initials(member.displayName)}
                                </i>
                              ))}
                              {team.members.length > 4 && <i>+{team.members.length - 4}</i>}
                            </span>
                          )}
                        </td>

                        <td>{team.stationsCompleted}</td>
                        <td className="us-strong">{points(team.points)}</td>
                        <td>{rank ? ordinal(rank) : "—"}</td>

                        <td className="us-table-actions">
                          <RowEditor>
                            <form className="us-form" action={updateTeamAction}>
                              <input type="hidden" name="id" value={team.id} />

                              <label className="us-field">
                                <span>Team name</span>
                                <input name="name" defaultValue={team.name} required />
                              </label>

                              <label className="us-field">
                                <span>Colour</span>
                                <input name="color" type="color" defaultValue={team.color} />
                              </label>

                              <label className="us-check">
                                <input type="checkbox" name="active" defaultChecked={team.active} />
                                <span>Available to claim</span>
                              </label>

                              <button className="us-btn us-btn-primary us-btn-sm" type="submit">
                                Save
                              </button>
                            </form>

                            {team.gamemasterId && (
                              <form action={releaseTeamAction} className="us-danger">
                                <input type="hidden" name="id" value={team.id} />
                                <button className="us-btn us-btn-warn us-btn-sm" type="submit">
                                  Release from {team.gamemasterName}
                                </button>
                                <small>
                                  Frees the team for another gamemaster. The booster it already
                                  drew stays — releasing is not a redraw.
                                </small>
                              </form>
                            )}

                            <form action={deleteTeamAction} className="us-danger">
                              <input type="hidden" name="id" value={team.id} />
                              <button className="us-btn us-btn-danger us-btn-sm" type="submit">
                                Delete team
                              </button>
                              <small>
                                {team.stationsCompleted > 0
                                  ? "This team has score history — deactivate it instead."
                                  : "No score history to lose."}
                              </small>
                            </form>
                          </RowEditor>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
