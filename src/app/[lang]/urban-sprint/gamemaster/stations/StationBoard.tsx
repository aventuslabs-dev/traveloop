"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Icon } from "@/app/components/Icons";
import { percent, points } from "@/lib/urban-sprint/format";
import type { Category, StationForTeam } from "@/lib/urban-sprint/types";
import {
  completeStationAction,
  createStationAction,
  type CompleteState,
  type QuickStationState,
} from "../actions";

/**
 * The station list and the confirm-a-completion flow.
 *
 * The only client component in the gamemaster experience, because it's the
 * only part that needs to hold something the server doesn't: which sheet is
 * open. Everything factual — which stations exist, what they'd score, what has
 * been completed — arrives already computed from the server and is re-rendered
 * after each confirmation, so this never does arithmetic of its own.
 *
 * Which sheet is showing is *derived* from the action result during render
 * rather than copied into state by an effect: a confirmed station closes its
 * own sheet because the result names it, not because something reacted to it.
 *
 * Double taps are handled twice over: `pending` disables the confirm button
 * for the round trip, and the database's partial unique index rejects any
 * second write that still gets through.
 */

type Filter = "todo" | "boosted" | "done";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "boosted", label: "Boosted" },
  { key: "done", label: "Done" },
];

export default function StationBoard({
  stations,
  categories,
  teamColor,
  boosterName,
  boosterCategory,
  bonusPercent,
}: {
  stations: StationForTeam[];
  categories: Category[];
  teamColor: string;
  boosterName: string;
  boosterCategory: string;
  bonusPercent: number;
}) {
  const [filter, setFilter] = useState<Filter>("todo");
  const [query, setQuery] = useState("");
  const [openStationId, setOpenStationId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  /** The station whose success screen has been waved away. */
  const [seenResultFor, setSeenResultFor] = useState<number | null>(null);

  const [completeState, completeAction, completePending] = useActionState<CompleteState, FormData>(
    completeStationAction,
    { status: "idle" }
  );

  const confirmedId = completeState.status === "ok" ? completeState.stationId : null;

  // Both derived: the sheet for a station that has just been confirmed is
  // closed because the result says so, and the success screen shows until it
  // is dismissed.
  const confirming =
    openStationId !== null && openStationId !== confirmedId
      ? stations.find((station) => station.id === openStationId) ?? null
      : null;

  const celebration =
    completeState.status === "ok" && seenResultFor !== completeState.stationId
      ? completeState
      : null;

  // Auto-dismiss: a gamemaster who has already started walking shouldn't have
  // an overlay waiting for them. setState from a timer callback, not from the
  // effect body, so it doesn't cascade a render.
  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setSeenResultFor(celebration.stationId), 4000);
    return () => clearTimeout(timer);
  }, [celebration]);

  // Reuses the Traveloop app's existing scroll-lock class rather than adding a
  // second mechanism for the same job.
  const sheetOpen = Boolean(confirming) || adding;
  useEffect(() => {
    document.body.classList.toggle("modal-open", sheetOpen);
    return () => document.body.classList.remove("modal-open");
  }, [sheetOpen]);

  const counts = useMemo(
    () => ({
      todo: stations.filter((station) => !station.completed).length,
      boosted: stations.filter((s) => !s.completed && s.projected.boosterApplied).length,
      done: stations.filter((station) => station.completed).length,
    }),
    [stations]
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return stations
      .filter((station) => {
        if (filter === "todo") return !station.completed;
        if (filter === "boosted") return !station.completed && station.projected.boosterApplied;
        return station.completed;
      })
      .filter((station) => {
        if (!needle) return true;
        return (
          station.name.toLowerCase().includes(needle) ||
          station.businessName.toLowerCase().includes(needle) ||
          station.categoryName.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => {
        // Boosted stops first — they're worth more, so they're what a
        // gamemaster deciding where to walk next wants at the top.
        if (a.projected.boosterApplied !== b.projected.boosterApplied) {
          return a.projected.boosterApplied ? -1 : 1;
        }
        return b.projected.totalPoints - a.projected.totalPoints;
      });
  }, [stations, filter, query]);

  return (
    <div className="us-stations" style={{ "--team": teamColor } as React.CSSProperties}>
      <div className="us-stations-tools">
        <div className="us-segment" role="tablist" aria-label="Filter stations">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={filter === item.key}
              className={`us-segment-btn${filter === item.key ? " is-active" : ""}`}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
              <i>{counts[item.key]}</i>
            </button>
          ))}
        </div>

        <label className="us-search">
          <Icon name="search" />
          <input
            type="search"
            value={query}
            placeholder="Find a shop"
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search stations"
          />
        </label>
      </div>

      {completeState.status === "error" && !confirming && (
        <p className="us-flash us-flash-err" role="alert">
          {completeState.message}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="us-empty">
          <p className="us-empty-title">
            {filter === "done" ? "Nothing completed yet" : "No stations here"}
          </p>
          <p className="us-empty-note">
            {filter === "boosted"
              ? `No ${boosterCategory} stations left to claim.`
              : "Try another filter, or add a shop you've found."}
          </p>
        </div>
      ) : (
        <ul className="us-stationlist">
          {visible.map((station) => (
            <li key={station.id}>
              <article
                className={`us-station${station.completed ? " is-done" : ""}${
                  station.projected.boosterApplied ? " is-boosted" : ""
                }`}
                style={{ "--cat": station.categoryColor } as React.CSSProperties}
              >
                <div className="us-station-main">
                  <p className="us-station-name">{station.name}</p>
                  {station.businessName && station.businessName !== station.name && (
                    <p className="us-station-biz">{station.businessName}</p>
                  )}

                  <p className="us-station-tags">
                    <span className="us-cat us-cat-sm">{station.categoryName}</span>
                    {station.projected.boosterApplied && (
                      <span className="us-station-boost">
                        <Icon name="bolt" />+{percent(bonusPercent)}
                      </span>
                    )}
                  </p>

                  {station.address && <p className="us-station-addr">{station.address}</p>}
                </div>

                <div className="us-station-side">
                  <span className="us-station-points">
                    {points(station.projected.totalPoints)}
                    <i>pts</i>
                  </span>

                  {station.completed ? (
                    <span className="us-station-done">
                      <Icon name="check" />
                      Done
                    </span>
                  ) : (
                    <button
                      className="us-btn us-btn-primary us-btn-sm"
                      type="button"
                      onClick={() => setOpenStationId(station.id)}
                    >
                      Complete
                    </button>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <button className="us-addstation" type="button" onClick={() => setAdding(true)}>
        <Icon name="store" />
        Add a shop you&rsquo;ve found
      </button>

      {confirming && (
        <ConfirmSheet
          station={confirming}
          boosterName={boosterName}
          pending={completePending}
          error={completeState.status === "error" ? completeState.message : null}
          formAction={completeAction}
          onClose={() => setOpenStationId(null)}
        />
      )}

      {adding && <AddStationSheet categories={categories} onClose={() => setAdding(false)} />}

      {celebration && (
        <div className="us-celebrate" role="status">
          <div className="us-celebrate-card">
            <span className="us-celebrate-tick" aria-hidden>
              <Icon name="check" />
            </span>
            <p className="us-celebrate-station">{celebration.stationName}</p>
            <p className="us-celebrate-points">+{points(celebration.breakdown.totalPoints)}</p>
            {celebration.breakdown.boosterApplied && (
              <p className="us-celebrate-boost">
                {celebration.breakdown.boosterName} paid +
                {points(celebration.breakdown.bonusPoints)}
              </p>
            )}
            <button
              className="us-btn us-btn-ghost us-btn-sm"
              type="button"
              onClick={() => setSeenResultFor(celebration.stationId)}
            >
              Keep going
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The confirmation, with the arithmetic spelled out. The numbers shown are the
 * server's projection for this team — the confirm posts only the station id,
 * and the award is recomputed server-side before anything is written.
 */
function ConfirmSheet({
  station,
  boosterName,
  pending,
  error,
  formAction,
  onClose,
}: {
  station: StationForTeam;
  boosterName: string;
  pending: boolean;
  error: string | null;
  formAction: (formData: FormData) => void;
  onClose: () => void;
}) {
  return (
    <div className="us-sheet-wrap" role="dialog" aria-modal="true" aria-label={`Complete ${station.name}`}>
      <button className="us-sheet-scrim" type="button" aria-label="Cancel" onClick={onClose} />

      <div className="us-sheet" style={{ "--cat": station.categoryColor } as React.CSSProperties}>
        <div className="us-sheet-grab" aria-hidden />

        <p className="us-eyebrow">Confirm completion</p>
        <h2 className="us-sheet-title">{station.name}</h2>
        <p className="us-sheet-sub">
          {station.businessName || station.categoryName} · {station.categoryName}
        </p>

        {station.instructions && <p className="us-sheet-instructions">{station.instructions}</p>}

        <div className="us-breakdown">
          <div className="us-breakdown-row">
            <span>Base points</span>
            <b>{points(station.projected.basePoints)}</b>
          </div>

          {station.projected.boosterApplied ? (
            <div className="us-breakdown-row is-bonus">
              <span>
                {boosterName} +{percent(station.projected.bonusPercent)}
              </span>
              <b>+{points(station.projected.bonusPoints)}</b>
            </div>
          ) : (
            <div className="us-breakdown-row is-muted">
              <span>Booster doesn&rsquo;t apply here</span>
              <b>+0</b>
            </div>
          )}

          <div className="us-breakdown-row is-total">
            <span>Total awarded</span>
            <b>{points(station.projected.totalPoints)}</b>
          </div>
        </div>

        {error && (
          <p className="us-flash us-flash-err" role="alert">
            {error}
          </p>
        )}

        <form action={formAction} className="us-sheet-actions">
          <input type="hidden" name="stationId" value={station.id} />
          <button className="us-btn us-btn-ghost" type="button" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button className="us-btn us-btn-primary us-btn-lg" type="submit" disabled={pending}>
            {pending ? "Confirming…" : "Confirm completion"}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Quick-add for a shop found in the field. Base points come from the campaign
 * default — pricing a station is an organiser decision, and asking for it here
 * would be one more thing to type on a pavement.
 *
 * On success the sheet swaps to a confirmation rather than closing itself: the
 * list behind it has already been revalidated, and staying put is what lets a
 * gamemaster add a second shop without hunting for the button again.
 */
function AddStationSheet({
  categories,
  onClose,
}: {
  categories: Category[];
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<QuickStationState, FormData>(
    createStationAction,
    { status: "idle" }
  );

  return (
    <div className="us-sheet-wrap" role="dialog" aria-modal="true" aria-label="Add a station">
      <button className="us-sheet-scrim" type="button" aria-label="Close" onClick={onClose} />

      <div className="us-sheet">
        <div className="us-sheet-grab" aria-hidden />

        {state.status === "ok" ? (
          <>
            <p className="us-eyebrow">Added</p>
            <h2 className="us-sheet-title">It&rsquo;s in the list</h2>
            <p className="us-sheet-sub">
              The station is live for every team, priced at the campaign default.
            </p>
            <button className="us-btn us-btn-primary us-btn-block us-btn-lg" type="button" onClick={onClose}>
              Back to stations
            </button>
          </>
        ) : (
          <>
            <p className="us-eyebrow">New station</p>
            <h2 className="us-sheet-title">Add a shop</h2>
            <p className="us-sheet-sub">
              It goes live for every team straight away, priced at the campaign default.
            </p>

            {state.status === "error" && (
              <p className="us-flash us-flash-err" role="alert">
                {state.message}
              </p>
            )}

            <form action={action} className="us-form">
              <label className="us-field">
                <span>Station name</span>
                <input name="name" required autoFocus />
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
                <span>Address</span>
                <input name="address" placeholder="Optional" />
              </label>

              <div className="us-sheet-actions">
                <button className="us-btn us-btn-ghost" type="button" onClick={onClose} disabled={pending}>
                  Cancel
                </button>
                <button className="us-btn us-btn-primary us-btn-lg" type="submit" disabled={pending}>
                  {pending ? "Adding…" : "Add station"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
