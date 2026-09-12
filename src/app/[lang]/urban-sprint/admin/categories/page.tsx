import { listCategories } from "@/lib/urban-sprint/categories-db";
import { listBoosters } from "@/lib/urban-sprint/boosters-db";
import { listStations } from "@/lib/urban-sprint/stations-db";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "../actions";
import { AdminFlash, AdminHead, Panel, RowEditor, Swatch } from "../ui";

/**
 * Categories are what connect a station to a booster, so this screen also
 * shows how many of each currently point at a category — deleting one that's
 * in use is refused by the database, and seeing the count first explains why.
 */
export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const [categories, stations, boosters] = await Promise.all([
    listCategories(),
    listStations(),
    listBoosters(),
  ]);

  const usage = new Map<number, { stations: number; boosters: number }>();
  for (const category of categories) usage.set(category.id, { stations: 0, boosters: 0 });
  for (const station of stations) {
    const entry = usage.get(station.categoryId);
    if (entry) entry.stations += 1;
  }
  for (const booster of boosters) {
    const entry = usage.get(booster.categoryId);
    if (entry) entry.boosters += 1;
  }

  return (
    <>
      <AdminHead
        title="Categories"
        note="The shared vocabulary for stations and boosters. A booster pays out on stations in its own category."
      />

      <AdminFlash params={params} />

      <div className="us-admingrid is-narrowfirst">
        <Panel title="New category">
          <form className="us-form" action={createCategoryAction}>
            <label className="us-field">
              <span>Name</span>
              <input name="name" placeholder="Food &amp; Beverage" required />
            </label>

            <div className="us-form-row">
              <label className="us-field">
                <span>Colour</span>
                <input name="color" type="color" defaultValue="#7c5cff" />
              </label>

              <label className="us-field">
                <span>Sort order</span>
                <input name="sortOrder" type="number" defaultValue={categories.length} />
              </label>
            </div>

            <button className="us-btn us-btn-primary us-btn-block" type="submit">
              Add category
            </button>
          </form>
        </Panel>

        <Panel title="All categories" count={categories.length} flush>
          {categories.length === 0 ? (
            <p className="us-panel-empty">
              No categories yet. Add one before creating stations or boosters.
            </p>
          ) : (
            <div className="us-tablewrap">
              <table className="us-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Slug</th>
                    <th>Stations</th>
                    <th>Boosters</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => {
                    const counts = usage.get(category.id) ?? { stations: 0, boosters: 0 };

                    return (
                      <tr key={category.id}>
                        <td>
                          <span className="us-tablename">
                            <Swatch color={category.color} />
                            {category.name}
                          </span>
                        </td>
                        <td className="us-mono">{category.slug}</td>
                        <td>{counts.stations}</td>
                        <td>{counts.boosters}</td>
                        <td className="us-table-actions">
                          <RowEditor>
                            <form className="us-form" action={updateCategoryAction}>
                              <input type="hidden" name="id" value={category.id} />

                              <label className="us-field">
                                <span>Name</span>
                                <input name="name" defaultValue={category.name} required />
                              </label>

                              <div className="us-form-row">
                                <label className="us-field">
                                  <span>Colour</span>
                                  <input name="color" type="color" defaultValue={category.color} />
                                </label>
                                <label className="us-field">
                                  <span>Sort order</span>
                                  <input
                                    name="sortOrder"
                                    type="number"
                                    defaultValue={category.sortOrder}
                                  />
                                </label>
                              </div>

                              <button className="us-btn us-btn-primary us-btn-sm" type="submit">
                                Save
                              </button>
                            </form>

                            <form action={deleteCategoryAction} className="us-danger">
                              <input type="hidden" name="id" value={category.id} />
                              <button className="us-btn us-btn-danger us-btn-sm" type="submit">
                                Delete category
                              </button>
                              <small>
                                {counts.stations + counts.boosters > 0
                                  ? "In use — the database will refuse this until nothing points at it."
                                  : "Nothing uses this category."}
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
