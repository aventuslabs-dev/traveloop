import { listUrbanSprintUsers } from "@/lib/urban-sprint/users-db";
import { URBAN_SPRINT_ROLES, type UrbanSprintUser } from "@/lib/urban-sprint/types";
import { ROLE_LABEL } from "@/lib/urban-sprint/auth";
import {
  createUserAction,
  deleteUserAction,
  setPasswordAction,
  updateUserAction,
} from "../actions";
import ConfirmButton from "../ConfirmButton";
import Dialog from "../Dialog";
import { AdminFlash, EmptyState, PageHeader, Panel, Pill, StatGrid } from "../ui";

/**
 * Urban Sprint accounts: the organisers and gamemasters who sign in. Racers
 * never do — each booked team follows its race from a private link — so there
 * is nothing here to create for them. A gamemaster claims their own team at
 * the start of the race; the Team column shows the one they're running.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const users = await listUrbanSprintUsers();

  const count = (role: string) => users.filter((user) => user.role === role).length;

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Organisers and gamemasters sign in at /urban-sprint/login. Racers don't need an account — each team gets a private link."
        actions={
          <Dialog label="New account" icon="plus" variant="primary" title="New account" wide>
            <UserForm />
          </Dialog>
        }
      />

      <AdminFlash params={params} />

      <StatGrid
        stats={[
          { label: "Admins", value: count("admin") },
          { label: "Gamemasters", value: count("gamemaster") },
          {
            label: "Running a team",
            value: users.filter((user) => user.teamName).length,
          },
          {
            label: "Suspended",
            value: users.filter((user) => !user.active).length,
          },
        ]}
      />

      <Panel title="All accounts" icon="users" count={String(users.length)} padded={false}>
        {users.length === 0 ? (
          <EmptyState icon="users" title="No Urban Sprint accounts yet" />
        ) : (
          <div className="ad-table-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th className="is-num" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.userId} className={user.active ? undefined : "is-dim"}>
                    <td>
                      <span className="ad-cell-stack">
                        <b>{user.displayName || "—"}</b>
                        <span>{user.email}</span>
                      </span>
                    </td>
                    <td>
                      <Pill
                        label={user.isOperator ? "Traveloop admin" : ROLE_LABEL[user.role]}
                        tone={user.role === "admin" ? "info" : "neutral"}
                      />
                    </td>
                    <td>{user.teamName ?? <span className="usc-muted">—</span>}</td>
                    <td>{user.phone || <span className="usc-muted">—</span>}</td>
                    <td>
                      <Pill
                        label={user.active ? "Active" : "Suspended"}
                        tone={user.active ? "success" : "warn"}
                      />
                    </td>
                    <td className="is-actions">
                      {user.isOperator ? (
                        <span className="usc-muted">Managed in Traveloop</span>
                      ) : (
                        <Dialog
                          label="Edit"
                          variant="small"
                          title={`Edit ${user.displayName || user.email}`}
                          description={user.email}
                          wide
                        >
                          <UserForm user={user} />
                          <form className="usc-danger" action={setPasswordAction}>
                            <input type="hidden" name="userId" value={user.userId} />
                            <label
                              className="admin-field"
                              style={{ flex: "1 1 220px", marginBottom: 0 }}
                            >
                              <span>New password</span>
                              <input name="password" type="text" minLength={8} required />
                            </label>
                            <button className="ad-btn" type="submit">
                              Reset password
                            </button>
                          </form>
                          <form className="usc-danger" action={deleteUserAction}>
                            <input type="hidden" name="userId" value={user.userId} />
                            <p>
                              Stations they confirmed stay in the history, with their name removed.
                              Suspending keeps the name.
                            </p>
                            <ConfirmButton message={`Delete ${user.email}? This can't be undone.`}>
                              Delete account
                            </ConfirmButton>
                          </form>
                        </Dialog>
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

/** New account when `user` is absent; otherwise that account's details. */
function UserForm({ user }: { user?: UrbanSprintUser }) {
  return (
    <form className="usc-form" action={user ? updateUserAction : createUserAction}>
      {user && <input type="hidden" name="userId" value={user.userId} />}

      <div className="ad-field-grid">
        {!user && (
          <label className="admin-field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="off" required />
          </label>
        )}
        <label className="admin-field">
          <span>Display name</span>
          <input
            name="displayName"
            defaultValue={user?.displayName}
            placeholder="Shown to their team"
          />
        </label>
        {!user && (
          <label className="admin-field">
            <span>Temporary password</span>
            <input name="password" type="text" minLength={8} required />
            <small className="usc-hint">At least 8 characters.</small>
          </label>
        )}
        <label className="admin-field">
          <span>Phone</span>
          <input name="phone" defaultValue={user?.phone ?? ""} placeholder="Optional" />
        </label>
      </div>

      <label className="admin-field">
        <span>Role</span>
        <select name="role" defaultValue={user?.role ?? "gamemaster"}>
          {URBAN_SPRINT_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role]}
            </option>
          ))}
        </select>
        <small className="usc-hint">Gamemasters claim their own team on race day.</small>
      </label>

      {user && (
        <label className="ad-check">
          <input type="checkbox" name="active" defaultChecked={user.active} />
          <span>
            <b>Can sign in</b>
            Moving someone off gamemaster releases any team they were running.
          </span>
        </label>
      )}

      <div className="usc-form-foot">
        <button className="ad-btn ad-btn-primary" type="submit">
          {user ? "Save account" : "Create account"}
        </button>
      </div>
    </form>
  );
}
