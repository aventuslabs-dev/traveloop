"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/app/components/Icons";
import { percent, points } from "@/lib/urban-sprint/format";
import {
  PLACEHOLDER_NOTICE,
  areaMapEmbedUrl,
  directionsUrl,
  distanceFromTeam,
  mapEmbedUrl,
} from "@/lib/urban-sprint/geo";
import type { StationForTeam } from "@/lib/urban-sprint/types";

/**
 * The participant's view of where the team can go.
 *
 * Deliberately the same list the gamemaster works from — same filters, same
 * boosted-first ordering, same points — so the two are looking at one picture
 * while standing next to each other. The difference is that there is no
 * confirm control anywhere on this screen: scoring is the gamemaster's job,
 * and the actions that do it are gated on that role, so this is read-only by
 * construction rather than by hiding a button.
 *
 * Distances and maps come from lib/urban-sprint/geo.ts and are placeholders.
 * The screen says so rather than passing invented numbers off as measurements.
 */

type Filter = "todo" | "boosted" | "done";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "boosted", label: "Boosted" },
  { key: "done", label: "Done" },
];

export default function ShopBoard({
  stations,
  teamColor,
  boosterName,
  boosterCategory,
  bonusPercent,
}: {
  stations: StationForTeam[];
  teamColor: string;
  boosterName: string | null;
  boosterCategory: string | null;
  bonusPercent: number | null;
}) {
  const [filter, setFilter] = useState<Filter>("todo");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const open = openId === null ? null : stations.find((s) => s.id === openId) ?? null;

  // Same scroll-lock class the rest of the app uses.
  useEffect(() => {
    document.body.classList.toggle("modal-open", Boolean(open));
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  const counts = useMemo(
    () => ({
      todo: stations.filter((s) => !s.completed).length,
      boosted: stations.filter((s) => !s.completed && s.projected.boosterApplied).length,
      done: stations.filter((s) => s.completed).length,
    }),
    [stations]
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return stations
      .filter((s) => {
        if (filter === "todo") return !s.completed;
        if (filter === "boosted") return !s.completed && s.projected.boosterApplied;
        return s.completed;
      })
      .filter((s) => {
        if (!needle) return true;
        return (
          s.name.toLowerCase().includes(needle) ||
          s.businessName.toLowerCase().includes(needle) ||
          s.categoryName.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => {
        if (a.projected.boosterApplied !== b.projected.boosterApplied) {
          return a.projected.boosterApplied ? -1 : 1;
        }
        return b.projected.totalPoints - a.projected.totalPoints;
      });
  }, [stations, filter, query]);

  return (
    <div className="us-stations" style={{ "--team": teamColor } as React.CSSProperties}>
      <section className="us-mapcard">
        <iframe
          className="us-mapframe"
          src={areaMapEmbedUrl()}
          title="Race area map"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="us-mapcard-foot">
          <p>
            <b>Race area</b> · {stations.length} shops in play
          </p>
          <p className="us-mapcard-note">{PLACEHOLDER_NOTICE}</p>
        </div>
      </section>

      <div className="us-stations-tools">
        <div className="us-segment" role="tablist" aria-label="Filter shops">
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
            aria-label="Search shops"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="us-empty">
          <p className="us-empty-title">
            {filter === "done" ? "Nothing completed yet" : "No shops here"}
          </p>
          <p className="us-empty-note">
            {filter === "boosted" && boosterCategory
              ? `No ${boosterCategory} shops left to claim.`
              : "Try another filter."}
          </p>
        </div>
      ) : (
        <ul className="us-stationlist">
          {visible.map((station) => {
            const distance = distanceFromTeam(station.id);

            return (
              <li key={station.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(station.id)}
                  className={`us-station us-station-tap${station.completed ? " is-done" : ""}${
                    station.projected.boosterApplied ? " is-boosted" : ""
                  }`}
                  style={{ "--cat": station.categoryColor } as React.CSSProperties}
                >
                  <span className="us-station-main">
                    <span className="us-station-name">{station.name}</span>
                    {station.businessName && station.businessName !== station.name && (
                      <span className="us-station-biz">{station.businessName}</span>
                    )}

                    <span className="us-station-tags">
                      <span className="us-cat us-cat-sm">{station.categoryName}</span>
                      {station.projected.boosterApplied && bonusPercent !== null && (
                        <span className="us-station-boost">
                          <Icon name="bolt" />+{percent(bonusPercent)}
                        </span>
                      )}
                      <span className="us-station-dist">
                        <Icon name="pin" />
                        {distance.label} · {distance.walkMinutes} min walk
                      </span>
                    </span>
                  </span>

                  <span className="us-station-side">
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
                      <span className="us-station-view">Details</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <ShopSheet
          station={open}
          boosterName={boosterName}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

/** Detail sheet: what the shop is, how to get there, and what it's worth. */
function ShopSheet({
  station,
  boosterName,
  onClose,
}: {
  station: StationForTeam;
  boosterName: string | null;
  onClose: () => void;
}) {
  const distance = distanceFromTeam(station.id);

  return (
    <div className="us-sheet-wrap" role="dialog" aria-modal="true" aria-label={station.name}>
      <button className="us-sheet-scrim" type="button" aria-label="Close" onClick={onClose} />

      <div className="us-sheet" style={{ "--cat": station.categoryColor } as React.CSSProperties}>
        <div className="us-sheet-grab" aria-hidden />

        <p className="us-eyebrow">{station.categoryName}</p>
        <h2 className="us-sheet-title">{station.name}</h2>
        {station.businessName && station.businessName !== station.name && (
          <p className="us-sheet-sub">{station.businessName}</p>
        )}

        <iframe
          className="us-mapframe is-sheet"
          src={mapEmbedUrl(station.address, station.businessName)}
          title={`Map of ${station.name}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        <div className="us-shopmeta">
          <span>
            <Icon name="pin" />
            {distance.label} away
          </span>
          <span>
            <Icon name="clock" />
            {distance.walkMinutes} min walk
          </span>
        </div>
        <p className="us-shopmeta-note">{PLACEHOLDER_NOTICE}</p>

        {station.address && <p className="us-sheet-instructions">{station.address}</p>}

        {station.instructions && (
          <>
            <p className="us-eyebrow">What to do here</p>
            <p className="us-sheet-instructions">{station.instructions}</p>
          </>
        )}

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
              <span>{boosterName ? "Your booster doesn't apply here" : "No booster drawn yet"}</span>
              <b>+0</b>
            </div>
          )}

          <div className="us-breakdown-row is-total">
            <span>{station.completed ? "Awarded" : "Worth"}</span>
            <b>{points(station.projected.totalPoints)}</b>
          </div>
        </div>

        {/* The one thing this screen deliberately cannot do. Saying so is
            clearer than leaving a gap where a button obviously belongs. */}
        <p className={`us-shopstatus${station.completed ? " is-done" : ""}`}>
          {station.completed ? (
            <>
              <Icon name="check" />
              Your team has already completed this shop.
            </>
          ) : (
            <>
              <Icon name="lock" />
              Your gamemaster confirms this when you arrive.
            </>
          )}
        </p>

        <div className="us-sheet-actions">
          <button className="us-btn us-btn-ghost" type="button" onClick={onClose}>
            Close
          </button>
          <a
            className="us-btn us-btn-primary us-btn-lg"
            href={directionsUrl(station.address, station.businessName)}
            target="_blank"
            rel="noreferrer"
          >
            Directions
          </a>
        </div>
      </div>
    </div>
  );
}
