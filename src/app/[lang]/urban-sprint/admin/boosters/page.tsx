import Link from "next/link";
import { listBoosters } from "@/lib/urban-sprint/boosters-db";
import { listCategories } from "@/lib/urban-sprint/categories-db";
import { listTeams } from "@/lib/urban-sprint/teams-db";
import { percent } from "@/lib/urban-sprint/format";
import type { Booster, Category } from "@/lib/urban-sprint/types";
import { createBoosterAction, deleteBoosterAction, updateBoosterAction } from "../actions";
import ConfirmButton from "../ConfirmButton";
import Dialog from "../Dialog";
import { AdminFlash, EmptyState, Flash, PageHeader, Panel, Pill, Swatch } from "../ui";

/**
 * Boosters and their bonus percentages. The percentage lives here, not in
 * code. Editing it changes future awards only: a completion snapshots the
 * percentage it was scored with, so past results never move under a team.
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
      <PageHeader
        title="Boosters"
        subtitle={`${activeCount} in the draw. Each team draws exactly one, at random, once.`}
        actions={
          categories.length > 0 && (
            <Dialog label="New booster" icon="plus" variant="primary" title="New booster">
              <BoosterForm action={createBoosterAction} submit="Add booster" categories={categories} />
            </Dialog>
          )
        }
      />

      <AdminFlash params={params} />

      {categories.length === 0 && (
        <Flash tone="err">
          <span>
            Add a <Link className="ad-link" href="/urban-sprint/admin/categories">category</Link>{" "}
            first — a booster has to point at one.
          </span>
        </Flash>
      )}

      <Panel title="All boosters" icon="bolt" count={String(boosters.length)} padded={false}>
        {boosters.length === 0 ? (
          <EmptyState icon="bolt" title="No boosters yet">
            Teams can&rsquo;t start the race until at least one is in the draw.
          </EmptyState>
        ) : (
          <div className="ad-table-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Booster</th>
                  <th>Category</th>
                  <th className="is-num">Bonus</th>
                  <th>Held by</th>
                  <th>Draw</th>
                  <th className="is-num" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {boosters.map((booster) => {
                  const held = holders.get(booster.id) ?? [];

                  return (
                    <tr key={booster.id} className={booster.active ? undefined : "is-dim"}>
                      <td>
                        <span className="ad-cell-stack">
                          <b>{booster.name}</b>
                          {booster.description && <span>{booster.description}</span>}
                        </span>
                      </td>
                      <td>
                        <span className="usc-name">
                          <Swatch color={booster.categoryColor} />
                          {booster.categoryName}
                        </span>
                      </td>
                      <td className="is-num is-strong">+{percent(booster.bonusPercent)}</td>
                      <td className="is-wrap">{held.length === 0 ? <span className="usc-muted">—</span> : held.join(", ")}</td>
                      <td>
                        <Pill label={booster.active ? "In draw" : "Out"} tone={booster.active ? "success" : "neutral"} />
                      </td>
                      <td className="is-actions">
                        <Dialog label="Edit" variant="small" title={`Edit ${booster.name}`}>
                          <BoosterForm
                            action={updateBoosterAction}
                            submit="Save booster"
                            categories={categories}
                            booster={booster}
                            holders={held.length}
                          />
                          <form className="usc-danger" action={deleteBoosterAction}>
                            <input type="hidden" name="id" value={booster.id} />
                            <p>
                              {held.length > 0
                                ? "A team already holds this — take it out of the draw instead."
                                : "No team holds this booster."}
                            </p>
                            <ConfirmButton message={`Delete ${booster.name}?`}>Delete booster</ConfirmButton>
                          </form>
                        </Dialog>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

function BoosterForm({
  action,
  submit,
  categories,
  booster,
  holders = 0,
}: {
  action: (formData: FormData) => Promise<void>;
  submit: string;
  categories: Category[];
  booster?: Booster;
  holders?: number;
}) {
  return (
    <form className="usc-form" action={action}>
      {booster && <input type="hidden" name="id" value={booster.id} />}
      <label className="admin-field">
        <span>Name</span>
        <input name="name" defaultValue={booster?.name} placeholder="Food Booster" required />
      </label>
      <div className="ad-field-grid">
        <label className="admin-field">
          <span>Category</span>
          <select name="categoryId" required defaultValue={booster?.categoryId ?? ""}>
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
          <span>Bonus percent</span>
          <input
            name="bonusPercent"
            type="number"
            min="0"
            step="0.5"
            defaultValue={booster?.bonusPercent ?? 25}
            required
          />
        </label>
      </div>
      <small className="usc-hint" style={{ marginTop: -8, marginBottom: 15 }}>
        {holders > 0
          ? `${holders} team${holders === 1 ? " holds" : "s hold"} this. A new percentage applies to their future stations only.`
          : "A 30-point station in this category awards 37.5 at +25%."}
      </small>
      <label className="admin-field">
        <span>Description</span>
        <input name="description" defaultValue={booster?.description} placeholder="Optional flavour text" />
      </label>
      <label className="ad-check">
        <input type="checkbox" name="active" defaultChecked={booster?.active ?? true} />
        <span>
          <b>In the draw</b>
          Taking a booster out leaves teams that already drew it untouched.
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
