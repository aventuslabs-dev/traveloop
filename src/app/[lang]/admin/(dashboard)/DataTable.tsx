"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/app/components/Icons";
import type { PillTone } from "./ui";

/**
 * The console's one table.
 *
 * Cells are described as data rather than rendered by the caller, because a
 * server component can't hand a client component a render function. The union
 * below covers everything the console actually shows; anything needing bespoke
 * markup (a form in a row, say) renders its own table with the same classes.
 */
export type Cell =
  | { kind: "text"; value: string; strong?: boolean }
  | { kind: "stack"; primary: string; secondary?: string }
  | { kind: "pill"; label: string; tone: PillTone }
  | { kind: "tier"; label: string }
  | { kind: "mono"; value: string; truncate?: boolean }
  | { kind: "num"; value: number; display: string; strong?: boolean }
  | { kind: "actions"; items: { href: string; icon: string; label: string; external?: boolean }[] };

export type Column = {
  key: string;
  label: string;
  align?: "right";
  sortable?: boolean;
};

export type Row = { id: string; cells: Record<string, Cell> };

/** What a cell contributes to search, and how it sorts. */
function cellText(cell: Cell | undefined): string {
  if (!cell) return "";
  switch (cell.kind) {
    case "text":
      return cell.value;
    case "stack":
      return `${cell.primary} ${cell.secondary ?? ""}`;
    case "pill":
    case "tier":
      return cell.label;
    case "mono":
      return cell.value;
    case "num":
      return cell.display;
    case "actions":
      return "";
  }
}

function cellSortValue(cell: Cell | undefined): string | number {
  if (cell?.kind === "num") return cell.value;
  return cellText(cell).toLowerCase();
}

function CellView({ cell }: { cell: Cell | undefined }) {
  if (!cell) return <>—</>;

  switch (cell.kind) {
    case "text":
      return <span className={cell.strong ? "is-strong" : undefined}>{cell.value || "—"}</span>;
    case "stack":
      return (
        <span className="ad-cell-stack">
          <b>{cell.primary || "—"}</b>
          {cell.secondary && <span>{cell.secondary}</span>}
        </span>
      );
    case "pill":
      return <span className={`ad-pill ad-pill-${cell.tone}`}>{cell.label}</span>;
    case "tier":
      return (
        <span className={`ad-tier ad-tier-${cell.label.toLowerCase()}`}>{cell.label}</span>
      );
    case "mono":
      return (
        <span className={`is-mono${cell.truncate ? " ad-truncate" : ""}`} title={cell.value}>
          {cell.value || "—"}
        </span>
      );
    case "num":
      return <span className={cell.strong ? "is-strong" : undefined}>{cell.display}</span>;
    case "actions":
      return (
        <span className="ad-actions">
          {cell.items.map((item) =>
            item.external ? (
              <a
                key={item.href + item.icon}
                className="ad-icon-btn"
                href={item.href}
                target="_blank"
                rel="noreferrer"
                title={item.label}
                aria-label={item.label}
              >
                <Icon name={item.icon} />
              </a>
            ) : (
              <Link
                key={item.href + item.icon}
                className="ad-icon-btn"
                href={item.href}
                title={item.label}
                aria-label={item.label}
              >
                <Icon name={item.icon} />
              </Link>
            )
          )}
        </span>
      );
  }
}

export default function DataTable({
  columns,
  rows,
  searchPlaceholder = "Search…",
  noun = "row",
  emptyIcon = "search",
  emptyTitle = "Nothing here yet",
  emptyBody,
}: {
  columns: Column[];
  rows: Row[];
  searchPlaceholder?: string;
  noun?: string;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter((row) =>
          Object.values(row.cells).some((cell) => cellText(cell).toLowerCase().includes(q))
        )
      : rows;

    if (!sort) return filtered;

    return [...filtered].sort((a, b) => {
      const av = cellSortValue(a.cells[sort.key]);
      const bv = cellSortValue(b.cells[sort.key]);
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * sort.dir;
    });
  }, [rows, query, sort]);

  function toggleSort(key: string) {
    setSort((current) =>
      current?.key === key ? { key, dir: current.dir === 1 ? -1 : 1 } : { key, dir: 1 }
    );
  }

  return (
    <>
      {rows.length > 0 && (
      <div className="ad-table-toolbar">
        <label className="ad-search">
          <Icon name="search" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </label>
        <span className="ad-table-count">
          {visible.length === rows.length
            ? `${rows.length} ${noun}${rows.length === 1 ? "" : "s"}`
            : `${visible.length} of ${rows.length}`}
        </span>
      </div>
      )}

      {visible.length === 0 ? (
        <div className="ad-empty">
          <span className="ad-empty-icon">
            <Icon name={rows.length === 0 ? emptyIcon : "search"} />
          </span>
          <p>
            <strong>{rows.length === 0 ? emptyTitle : "No matches"}</strong>
            {rows.length === 0
              ? emptyBody
              : `Nothing matches “${query}”. Try a different search.`}
          </p>
        </div>
      ) : (
        <div className="ad-table-scroll">
          <table className="ad-table">
            <thead>
              <tr>
                {columns.map((col) => {
                  const sorted = sort?.key === col.key;
                  return (
                    <th
                      key={col.key}
                      className={col.align === "right" ? "is-num" : undefined}
                      aria-sort={
                        sorted ? (sort.dir === 1 ? "ascending" : "descending") : undefined
                      }
                    >
                      {col.sortable === false ? (
                        col.label
                      ) : (
                        <button
                          type="button"
                          className={`ad-sort${sorted ? " is-sorted" : ""}`}
                          onClick={() => toggleSort(col.key)}
                        >
                          {col.label}
                          <span className="ad-sort-arrow" aria-hidden="true">
                            {sorted ? (sort.dir === 1 ? "▲" : "▼") : "◆"}
                          </span>
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td key={col.key} className={col.align === "right" ? "is-num" : undefined}>
                      <CellView cell={row.cells[col.key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
