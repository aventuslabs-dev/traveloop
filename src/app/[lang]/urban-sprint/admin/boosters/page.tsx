import { listBoosters } from "@/lib/urban-sprint/boosters-db";
import { listCategories } from "@/lib/urban-sprint/categories-db";
import { listTeams } from "@/lib/urban-sprint/teams-db";
import { percent } from "@/lib/urban-sprint/format";
import { createBoosterAction, deleteBoosterAction, updateBoosterAction } from "../actions";
import { AdminFlash, AdminHead, Panel, RowEditor, Swatch } from "../ui";

/**
 * Boosters and their bonus percentages.
 *
 * The percentage is the number the whole scoring rule turns on and it lives
 * here, not in code. Editing it changes future awards only: a completion
 * snapshots the percentage it was scored with, so past results never move
 * under a team.
 */
export default async function AdminBoostersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const [boosters, categories, teams] = await Promise.all([
    listBoosters(),
    listCategories(),
    listTeams(),
  ]);

  const holders = new Map<number, string[]>();
  for (const team of teams) {
    if (!team.booster) continue;
    const list = holders.get(team.booster.id) ?? [];
    list.push(team.name);
    holders.set(team.booster.id, list);
  }

  const activeCount = boosters.filter((booster) => booster.active).length;

  return (
    <>
      <AdminHead
        title="Boosters"
        note={`${activeCount} active booster${activeCount === 1 ? "" : "s"} in the draw. Each team draws exactly one, at random, once.`}
      />

      <AdminFlash params={params} />

      {categories.length === 0 && (
        <p className="us-flash us-flash-err">
          Add a category first — a booster has to point at one.
        </p>
      )}

      <div className="us-admingrid is-narrowfirst">
        <Panel title="New booster">
          <form className="us-form" action={createBoosterAction}>
            <label className="us-field">
              <span>Name</span>
              <input name="name" placeholder="Food Booster" required />
            </label>

            <label className="us-field">
              <span>Category</span>
              <select name="categoryId" required defaultValue="">
                <option value="" disabled>
                  Choose one
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="us-field">
              <span>Bonus percent</span>
              <input name="bonusPercent" type="number" min="0" step="0.5" defaultValue={25} required />
              <small>A 30-point station in this category would award 37.5 at +25%.</small>
            </label>

            <label className="us-field">
              <span>Description</span>
              <input name="description" placeholder="Optional flavour text" />
            </label>

            <label className="us-check">
              <input type="checkbox" name="active" defaultChecked />
              <span>In the draw</span>
            </label>

            <button className="us-btn us-btn-primary us-btn-block" type="submit">
              Add booster
            </button>
          </form>
        </Panel>

        <Panel title="All boosters" count={boosters.length} flush>
          {boosters.length === 0 ? (
            <p className="us-panel-empty">
              No boosters yet. Teams can&rsquo;t start the race until at least one is active.
            </p>
          ) : (
            <div className="us-tablewrap">
              <table className="us-table">
                <thead>
                  <tr>
                    <th>Booster</th>
                    <th>Category</th>
                    <th>Bonus</th>
                    <th>Held by</th>
                    <th>In draw</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {boosters.map((booster) => {
                    const held = holders.get(booster.id) ?? [];

                    return (
                      <tr key={booster.id} className={booster.active ? undefined : "is-dim"}>
                        <td>
                          <span className="us-tablename">
                            <Swatch color={booster.categoryColor} />
                            {booster.name}
                          </span>
                          {booster.description && (
                            <span className="us-tablesub">{booster.description}</span>
                          )}
                        </td>
                        <td>{booster.categoryName}</td>
                        <td className="us-strong">+{percent(booster.bonusPercent)}</td>
                        <td>{held.length === 0 ? "—" : held.join(", ")}</td>
                        <td>
                          <span className={`us-pill us-pill-${booster.active ? "ok" : "neutral"}`}>
                            {booster.active ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="us-table-actions">
                          <RowEditor>
                            <form className="us-form" action={updateBoosterAction}>
                              <input type="hidden" name="id" value={booster.id} />

                              <label className="us-field">
                                <span>Name</span>
                                <input name="name" defaultValue={booster.name} required />
                              </label>

                              <div className="us-form-row">
                                <label className="us-field">
                                  <span>Category</span>
                                  <select name="categoryId" defaultValue={booster.categoryId}>
                                    {categories.map((category) => (
                                      <option key={category.id} value={category.id}>
                                        {category.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="us-field">
                                  <span>Bonus %</span>
                                  <input
                                    name="bonusPercent"
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    defaultValue={booster.bonusPercent}
                                  />
                                </label>
                              </div>

                              <label className="us-field">
                                <span>Description</span>
                                <input name="description" defaultValue={booster.description} />
                              </label>

                              <label className="us-check">
                                <input type="checkbox" name="active" defaultChecked={booster.active} />
                                <span>In the draw</span>
                              </label>

                              <button className="us-btn us-btn-primary us-btn-sm" type="submit">
                                Save
                              </button>
                              {held.length > 0 && (
                                <small className="us-form-note">
                                  {held.length} team{held.length === 1 ? " holds" : "s hold"} this.
                                  Changing the bonus affects their future stations only — points
                                  already awarded keep the percentage they were scored with.
                                </small>
                              )}
                            </form>

                            <form action={deleteBoosterAction} className="us-danger">
                              <input type="hidden" name="id" value={booster.id} />
                              <button className="us-btn us-btn-danger us-btn-sm" type="submit">
                                Delete booster
                              </button>
                              <small>
                                {held.length > 0
                                  ? "A team already holds this — deactivate it instead."
                                  : "No team holds this booster."}
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
