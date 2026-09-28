import { listCategories } from "@/lib/urban-sprint/categories-db";
import { listBoosters } from "@/lib/urban-sprint/boosters-db";
import { listStations } from "@/lib/urban-sprint/stations-db";
import type { Category } from "@/lib/urban-sprint/types";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "../actions";
import ConfirmButton from "../ConfirmButton";
import Dialog from "../Dialog";
import { AdminFlash, EmptyState, PageHeader, Panel, Swatch } from "../ui";

/**
 * Categories connect a station to a booster, so this screen also shows how
 * many of each point at a category — deleting one in use is refused by the
 * database, and seeing the count first explains why.
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
      <PageHeader
        title="Categories"
        subtitle="The shared vocabulary for stations and boosters. A booster pays out on stations in its own category."
        actions={
          <Dialog label="New category" icon="plus" variant="primary" title="New category">
            <CategoryForm action={createCategoryAction} submit="Add category" nextSort={categories.length} />
          </Dialog>
        }
      />

      <AdminFlash params={params} />

      <Panel title="All categories" icon="tag" count={String(categories.length)} padded={false}>
        {categories.length === 0 ? (
          <EmptyState icon="tag" title="No categories yet">
            Add one before creating stations or boosters.
          </EmptyState>
        ) : (
          <div className="ad-table-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Slug</th>
                  <th className="is-num">Stations</th>
                  <th className="is-num">Boosters</th>
                  <th className="is-num">Order</th>
                  <th className="is-num" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => {
                  const counts = usage.get(category.id) ?? { stations: 0, boosters: 0 };
                  const inUse = counts.stations + counts.boosters > 0;

                  return (
                    <tr key={category.id}>
                      <td>
                        <span className="usc-name">
                          <Swatch color={category.color} />
                          {category.name}
                        </span>
                      </td>
                      <td className="is-mono">{category.slug}</td>
                      <td className="is-num">{counts.stations}</td>
                      <td className="is-num">{counts.boosters}</td>
                      <td className="is-num">{category.sortOrder}</td>
                      <td className="is-actions">
                        <Dialog label="Edit" variant="small" title={`Edit ${category.name}`}>
                          <CategoryForm action={updateCategoryAction} submit="Save category" category={category} />
                          <form className="usc-danger" action={deleteCategoryAction}>
                            <input type="hidden" name="id" value={category.id} />
                            <p>
                              {inUse
                                ? `In use by ${counts.stations} station(s) and ${counts.boosters} booster(s) — the database will refuse this until nothing points at it.`
                                : "Nothing uses this category."}
                            </p>
                            <ConfirmButton message={`Delete ${category.name}?`}>Delete category</ConfirmButton>
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

function CategoryForm({
  action,
  submit,
  category,
  nextSort = 0,
}: {
  action: (formData: FormData) => Promise<void>;
  submit: string;
  category?: Category;
  nextSort?: number;
}) {
  return (
    <form className="usc-form" action={action}>
      {category && <input type="hidden" name="id" value={category.id} />}
      <label className="admin-field">
        <span>Name</span>
        <input name="name" defaultValue={category?.name} placeholder="Food & Beverage" required />
      </label>
      <div className="ad-field-grid">
        <label className="admin-field">
          <span>Colour</span>
          <input name="color" type="color" defaultValue={category?.color ?? "#7c5cff"} />
        </label>
        <label className="admin-field">
          <span>Sort order</span>
          <input name="sortOrder" type="number" defaultValue={category?.sortOrder ?? nextSort} />
        </label>
      </div>
      <div className="usc-form-foot">
        <button className="ad-btn ad-btn-primary" type="submit">
          {submit}
        </button>
      </div>
    </form>
  );
}
