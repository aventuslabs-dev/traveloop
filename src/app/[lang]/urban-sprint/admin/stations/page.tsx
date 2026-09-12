import { listCategories } from "@/lib/urban-sprint/categories-db";
import { listStations } from "@/lib/urban-sprint/stations-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { points } from "@/lib/urban-sprint/format";
import { createStationAction, deleteStationAction, updateStationAction } from "../actions";
import { AdminFlash, AdminHead, Panel, RowEditor, Swatch } from "../ui";

export default async function AdminStationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const [stations, categories, settings] = await Promise.all([
    listStations(),
    listCategories(),
    getSettings(),
  ]);

  const active = stations.filter((station) => station.active).length;

  return (
    <>
      <AdminHead
        title="Stations"
        note={`${active} of ${stations.length} in play. Gamemasters can add stations from the field; they arrive priced at the campaign default.`}
      />

      <AdminFlash params={params} />

      {categories.length === 0 && (
        <p className="us-flash us-flash-err">Add a category before creating stations.</p>
      )}

      <div className="us-admingrid is-narrowfirst">
        <Panel title="New station">
          <form className="us-form" action={createStationAction}>
            <label className="us-field">
              <span>Station name</span>
              <input name="name" placeholder="ABC Cafe" required />
            </label>

            <label className="us-field">
              <span>Business name</span>
              <input name="businessName" placeholder="Same as station name" />
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
              <span>Base points</span>
              <input
                name="basePoints"
                type="number"
                min="0"
                step="0.5"
                defaultValue={settings.defaultBasePoints}
                required
              />
              <small>Campaign default is {points(settings.defaultBasePoints)}.</small>
            </label>

            <label className="us-field">
              <span>Address</span>
              <input name="address" placeholder="Where teams will find it" />
            </label>

            <label className="us-field">
              <span>Instructions</span>
              <textarea
                name="instructions"
                rows={3}
                placeholder="What the team has to do here. Shown on the gamemaster's confirmation sheet."
              />
            </label>

            <label className="us-check">
              <input type="checkbox" name="active" defaultChecked />
              <span>In play</span>
            </label>

            <button className="us-btn us-btn-primary us-btn-block" type="submit">
              Add station
            </button>
          </form>
        </Panel>

        <Panel title="All stations" count={stations.length} flush>
          {stations.length === 0 ? (
            <p className="us-panel-empty">No stations yet.</p>
          ) : (
            <div className="us-tablewrap">
              <table className="us-table">
                <thead>
                  <tr>
                    <th>Station</th>
                    <th>Category</th>
                    <th>Base</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {stations.map((station) => (
                    <tr key={station.id} className={station.active ? undefined : "is-dim"}>
                      <td>
                        <span className="us-tablename">
                          <Swatch color={station.categoryColor} />
                          {station.name}
                        </span>
                        {station.businessName && station.businessName !== station.name && (
                          <span className="us-tablesub">{station.businessName}</span>
                        )}
                        {station.address && <span className="us-tablesub">{station.address}</span>}
                      </td>
                      <td>{station.categoryName}</td>
                      <td className="us-strong">{points(station.basePoints)}</td>
                      <td>
                        <span className={`us-pill us-pill-${station.active ? "ok" : "neutral"}`}>
                          {station.active ? "In play" : "Retired"}
                        </span>
                      </td>
                      <td className="us-table-actions">
                        <RowEditor>
                          <form className="us-form" action={updateStationAction}>
                            <input type="hidden" name="id" value={station.id} />

                            <label className="us-field">
                              <span>Station name</span>
                              <input name="name" defaultValue={station.name} required />
                            </label>

                            <label className="us-field">
                              <span>Business name</span>
                              <input name="businessName" defaultValue={station.businessName} />
                            </label>

                            <div className="us-form-row">
                              <label className="us-field">
                                <span>Category</span>
                                <select name="categoryId" defaultValue={station.categoryId}>
                                  {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="us-field">
                                <span>Base points</span>
                                <input
                                  name="basePoints"
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  defaultValue={station.basePoints}
                                />
                              </label>
                            </div>

                            <label className="us-field">
                              <span>Address</span>
                              <input name="address" defaultValue={station.address} />
                            </label>

                            <label className="us-field">
                              <span>Instructions</span>
                              <textarea name="instructions" rows={3} defaultValue={station.instructions} />
                            </label>

                            <label className="us-check">
                              <input type="checkbox" name="active" defaultChecked={station.active} />
                              <span>In play</span>
                            </label>

                            <button className="us-btn us-btn-primary us-btn-sm" type="submit">
                              Save
                            </button>
                            <small className="us-form-note">
                              Re-pricing affects future completions only — points already awarded
                              keep the base they were scored with.
                            </small>
                          </form>

                          <form action={deleteStationAction} className="us-danger">
                            <input type="hidden" name="id" value={station.id} />
                            <button className="us-btn us-btn-danger us-btn-sm" type="submit">
                              Delete station
                            </button>
                            <small>
                              Refused once any team has completed it — retire it instead so the
                              score history stays readable.
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
