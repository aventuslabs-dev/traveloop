import { listUrbanSprintUsers } from "@/lib/urban-sprint/users-db";
import { listTeams } from "@/lib/urban-sprint/teams-db";
import { URBAN_SPRINT_ROLES } from "@/lib/urban-sprint/types";
import { ROLE_LABEL } from "@/lib/urban-sprint/auth";
import { initials } from "@/lib/urban-sprint/format";
import {
  createUserAction,
  deleteUserAction,
  setPasswordAction,
  updateUserAction,
} from "../actions";
import { AdminFlash, AdminHead, Panel, RowEditor } from "../ui";

/**
 * Urban Sprint accounts.
 *
 * Creating one here grants Urban Sprint access and nothing else — these
 * accounts can't reach the Traveloop console, which is gated on a different
 * credential entirely. Team assignment only applies to participants; a
 * gamemaster's team is whichever one they claim for themselves at the start of
 * the race.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const [users, teams] = await Promise.all([listUrbanSprintUsers(), listTeams()]);

  const byRole = {
    admin: users.filter((user) => user.role === "admin"),
    gamemaster: users.filter((user) => user.role === "gamemaster"),
    participant: users.filter((user) => user.role === "participant"),
  };

  return (
    <>
      <AdminHead
        title="Users"
        note={`${byRole.admin.length} admins · ${byRole.gamemaster.length} gamemasters · ${byRole.participant.length} participants`}
      />

      <AdminFlash params={params} />

      <div className="us-admingrid is-narrowfirst">
        <Panel title="New account" note="They sign in at /urban-sprint/login.">
          <form className="us-form" action={createUserAction}>
            <label className="us-field">
              <span>Email</span>
              <input name="email" type="email" autoComplete="off" required />
            </label>

            <label className="us-field">
              <span>Display name</span>
              <input name="displayName" placeholder="Shown to their team" />
            </label>

            <label className="us-field">
              <span>Temporary password</span>
              <input name="password" type="text" minLength={8} required />
              <small>At least 8 characters. They keep it until you reset it.</small>
            </label>

            <label className="us-field">
              <span>Role</span>
              <select name="role" defaultValue="participant">
                {URBAN_SPRINT_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </select>
            </label>

            <label className="us-field">
              <span>Team</span>
              <select name="teamId" defaultValue="">
                <option value="">No team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <small>Participants only — gamemasters claim their own team.</small>
            </label>

            <label className="us-field">
              <span>Phone</span>
              <input name="phone" placeholder="Optional" />
            </label>

            <button className="us-btn us-btn-primary us-btn-block" type="submit">
              Create account
            </button>
          </form>
        </Panel>

        <Panel title="All accounts" count={users.length} flush>
          {users.length === 0 ? (
            <p className="us-panel-empty">No Urban Sprint accounts yet.</p>
          ) : (
            <div className="us-tablewrap">
              <table className="us-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Role</th>
                    <th>Team</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.userId} className={user.active ? undefined : "is-dim"}>
                      <td>
                        <span className="us-tablename">
                          <i className="us-avatar">{initials(user.displayName || user.email)}</i>
                          {user.displayName || "—"}
                        </span>
                        <span className="us-tablesub">{user.email}</span>
                      </td>

                      <td>
                        <span className={`us-pill us-pill-${user.role === "admin" ? "accent" : "neutral"}`}>
                          {ROLE_LABEL[user.role]}
                        </span>
                      </td>

                      <td>{user.teamName ?? <span className="us-dim">—</span>}</td>

                      <td>
                        <span className={`us-pill us-pill-${user.active ? "ok" : "warn"}`}>
                          {user.active ? "Active" : "Suspended"}
                        </span>
                      </td>

                      <td className="us-table-actions">
                        <RowEditor>
                          <form className="us-form" action={updateUserAction}>
                            <input type="hidden" name="userId" value={user.userId} />

                            <label className="us-field">
                              <span>Display name</span>
                              <input name="displayName" defaultValue={user.displayName} />
                            </label>

                            <div className="us-form-row">
                              <label className="us-field">
                                <span>Role</span>
                                <select name="role" defaultValue={user.role}>
                                  {URBAN_SPRINT_ROLES.map((role) => (
                                    <option key={role} value={role}>
                                      {ROLE_LABEL[role]}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="us-field">
                                <span>Team</span>
                                <select name="teamId" defaultValue={user.teamId ?? ""}>
                                  <option value="">No team</option>
                                  {teams.map((team) => (
                                    <option key={team.id} value={team.id}>
                                      {team.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>

                            <label className="us-field">
                              <span>Phone</span>
                              <input name="phone" defaultValue={user.phone ?? ""} />
                            </label>

                            <label className="us-check">
                              <input type="checkbox" name="active" defaultChecked={user.active} />
                              <span>Can sign in</span>
                            </label>

                            <button className="us-btn us-btn-primary us-btn-sm" type="submit">
                              Save
                            </button>
                            <small className="us-form-note">
                              Moving someone off gamemaster releases any team they were running;
                              moving them off participant removes them from a squad.
                            </small>
                          </form>

                          <form className="us-form" action={setPasswordAction}>
                            <input type="hidden" name="userId" value={user.userId} />
                            <label className="us-field">
                              <span>New password</span>
                              <input name="password" type="text" minLength={8} required />
                            </label>
                            <button className="us-btn us-btn-ghost us-btn-sm" type="submit">
                              Reset password
                            </button>
                          </form>

                          <form action={deleteUserAction} className="us-danger">
                            <input type="hidden" name="userId" value={user.userId} />
                            <button className="us-btn us-btn-danger us-btn-sm" type="submit">
                              Delete account
                            </button>
                            <small>
                              Stations they confirmed stay in the history, with their name
                              removed. Suspending keeps the name.
                            </small>
                          </form>
                        </RowEditor>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
