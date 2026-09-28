import Link from "next/link";
import { listCategories } from "@/lib/urban-sprint/categories-db";
import { listStations } from "@/lib/urban-sprint/stations-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { points } from "@/lib/urban-sprint/format";
import type { Category, Station } from "@/lib/urban-sprint/types";
import { createStationAction, deleteStationAction, updateStationAction } from "../actions";
import ConfirmButton from "../ConfirmButton";
import Dialog from "../Dialog";
import { AdminFlash, EmptyState, Flash, PageHeader, Panel, Pill, StatGrid, Swatch } from "../ui";

/**
 * The participating shops. Gamemasters can add one from the field; it arrives
 * priced at the campaign default (Settings), and can be re-priced here.
 */
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
      <PageHeader
        title="Stations"
        subtitle={`New stations start at ${points(settings.defaultBasePoints)} points — change the default in Settings.`}
        actions={
          categories.length > 0 && (
            <Dialog label="New station" icon="plus" variant="primary" title="New station" wide>
              <StationForm
                action={createStationAction}
                submit="Add station"
                categories={categories}
                defaultBasePoints={settings.defaultBasePoints}
              />
            </Dialog>
          )
        }
      />

      <AdminFlash params={params} />

      {categories.length === 0 && (
        <Flash tone="err">
          <span>
            Add a <Link className="ad-link" href="/urban-sprint/admin/categories">category</Link>{" "}
            before creating stations.
          </span>
        </Flash>
      )}

      <StatGrid
        stats={[
          { label: "In play", value: active },
          { label: "Retired", value: stations.length - active },
          { label: "Categories", value: categories.length },
        ]}
      />

      <Panel title="All stations" icon="pin" count={String(stations.length)} padded={false}>
        {stations.length === 0 ? (
          <EmptyState icon="pin" title="No stations yet">
            Add the shops teams will race between.
          </EmptyState>
        ) : (
          <div className="ad-table-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Category</th>
                  <th>Address</th>
                  <th className="is-num">Base points</th>
                  <th>Status</th>
                  <th className="is-num" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {stations.map((station) => (
                  <tr key={station.id} className={station.active ? undefined : "is-dim"}>
                    <td>
                      <span className="ad-cell-stack">
                        <b>{station.name}</b>
                        {station.businessName && station.businessName !== station.name && (
                          <span>{station.businessName}</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className="usc-name">
                        <Swatch color={station.categoryColor} />
                        {station.categoryName}
                      </span>
                    </td>
                    <td className="is-wrap">{station.address || <span className="usc-muted">—</span>}</td>
                    <td className="is-num is-strong">{points(station.basePoints)}</td>
                    <td>
                      <Pill label={station.active ? "In play" : "Retired"} tone={station.active ? "success" : "neutral"} />
                    </td>
                    <td className="is-actions">
                      <Dialog label="Edit" variant="small" title={`Edit ${station.name}`} wide>
                        <StationForm
                          action={updateStationAction}
                          submit="Save station"
                          categories={categories}
                          station={station}
                        />
                        <form className="usc-danger" action={deleteStationAction}>
                          <input type="hidden" name="id" value={station.id} />
                          <p>
                            Refused once any team has completed it — retire it instead so the score
                            history stays readable.
                          </p>
                          <ConfirmButton message={`Delete ${station.name}? This can't be undone.`}>
                            Delete station
                          </ConfirmButton>
                        </form>
                      </Dialog>
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

function StationForm({
  action,
  submit,
  categories,
  station,
  defaultBasePoints,
}: {
  action: (formData: FormData) => Promise<void>;
  submit: string;
  categories: Category[];
  station?: Station;
  defaultBasePoints?: number;
}) {
  return (
    <form className="usc-form" action={action}>
      {station && <input type="hidden" name="id" value={station.id} />}

      <div className="ad-field-grid">
        <label className="admin-field">
          <span>Station name</span>
          <input name="name" defaultValue={station?.name} placeholder="ABC Cafe" required />
        </label>
        <label className="admin-field">
          <span>Business name</span>
          <input name="businessName" defaultValue={station?.businessName} placeholder="Same as station name" />
        </label>
      </div>

      <div className="ad-field-grid">
        <label className="admin-field">
          <span>Category</span>
          <select name="categoryId" required defaultValue={station?.categoryId ?? ""}>
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
        <label className="admin-field">
          <span>Base points</span>
          <input
            name="basePoints"
            type="number"
            min="0"
            step="0.5"
            defaultValue={station?.basePoints ?? defaultBasePoints}
            required
          />
          {station && (
            <small className="usc-hint">Re-pricing affects future completions only.</small>
          )}
        </label>
      </div>

      <label className="admin-field">
        <span>Address</span>
        <input name="address" defaultValue={station?.address} placeholder="Where teams will find it" />
      </label>

      <label className="admin-field">
        <span>Instructions</span>
        <textarea
          name="instructions"
          rows={3}
          defaultValue={station?.instructions}
          placeholder="What the team has to do here. Shown on the gamemaster's confirmation sheet."
        />
      </label>

      <label className="ad-check">
        <input type="checkbox" name="active" defaultChecked={station?.active ?? true} />
        <span>
          <b>In play</b>
          Retired stations stay in the score history but can&rsquo;t be completed.
        </span>
      </label>

      <div className="usc-form-foot">
        <button className="ad-btn ad-btn-primary" type="submit">
          {submit}
        </button>
      </div>
    </form>
  );
}
