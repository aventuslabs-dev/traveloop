import Link from "next/link";
import { ordinal, percent, points } from "@/lib/urban-sprint/format";
import type { EventStatus } from "@/lib/urban-sprint/types";

/* Presentational primitives for Urban Sprint. All server-safe, so pages stay
   Server Components and the only client code in the product is the handful of
   pieces that genuinely need interaction. */

/** The logotype. Two weights of one word — the sprint is in the letterspacing. */
export function Wordmark({ href = "/urban-sprint" }: { href?: string }) {
  return (
    <Link className="us-wordmark" href={href} aria-label="Urban Sprint home">
      <span className="us-wordmark-mark" aria-hidden>
        US
      </span>
      <span className="us-wordmark-text">
        <b>Urban</b>
        <i>Sprint</i>
      </span>
    </Link>
  );
}

const STATUS_COPY: Record<EventStatus, { label: string; note: string }> = {
  upcoming: { label: "Starting soon", note: "Teams are still forming" },
  live: { label: "Race live", note: "Scores updating in real time" },
  paused: { label: "Paused", note: "Play is on hold" },
  ended: { label: "Race over", note: "Final standings below" },
};

export function StatusPill({ status }: { status: EventStatus }) {
  const copy = STATUS_COPY[status];

  return (
    <span className={`us-status us-status-${status}`}>
      <i className="us-status-dot" aria-hidden />
      {copy.label}
    </span>
  );
}

export function statusNote(status: EventStatus): string {
  return STATUS_COPY[status].note;
}

/** The "updating live" marker. Purely a signal — LiveRefresh does the work. */
export function LivePill({ label = "Live" }: { label?: string }) {
  return (
    <span className="us-livepill">
      <i aria-hidden />
      {label}
    </span>
  );
}

export function CategoryChip({
  name,
  color,
  size = "md",
}: {
  name: string;
  color: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`us-cat us-cat-${size}`}
      // Category colours are operator data, so they arrive as a value rather
      // than a class — a new category must not need a CSS deploy.
      style={{ "--cat": color } as React.CSSProperties}
    >
      {name}
    </span>
  );
}

export function BoosterChip({
  name,
  categoryName,
  bonusPercent,
  color,
}: {
  name: string;
  categoryName: string;
  bonusPercent: number;
  color?: string;
}) {
  return (
    <span className="us-booster" style={{ "--cat": color ?? "#7c5cff" } as React.CSSProperties}>
      <b>{name}</b>
      <span>{categoryName}</span>
      <em>+{percent(bonusPercent)}</em>
    </span>
  );
}

/** Rank marker — the top three get the podium treatment, everyone else a number. */
export function RankBadge({ rank }: { rank: number }) {
  const podium = rank <= 3 ? ` us-rank-${rank}` : "";
  return (
    <span className={`us-rank${podium}`} aria-label={`${ordinal(rank)} place`}>
      {rank}
    </span>
  );
}

/** Big score readout. `tone` shifts it to the accent for a team's own total. */
export function Points({
  value,
  suffix = "pts",
  tone,
}: {
  value: number;
  suffix?: string | null;
  tone?: "accent";
}) {
  return (
    <span className={`us-points${tone ? ` is-${tone}` : ""}`}>
      <b>{points(value)}</b>
      {suffix && <i>{suffix}</i>}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  note,
  actions,
}: {
  eyebrow?: string;
  title: string;
  note?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="us-sechead">
      <div>
        {eyebrow && <p className="us-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {note && <p className="us-sechead-note">{note}</p>}
      </div>
      {actions && <div className="us-sechead-actions">{actions}</div>}
    </header>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="us-empty">
      <p className="us-empty-title">{title}</p>
      {children && <p className="us-empty-note">{children}</p>}
    </div>
  );
}

export function Flash({
  tone,
  children,
}: {
  tone: "ok" | "err" | "info";
  children: React.ReactNode;
}) {
  return (
    <p className={`us-flash us-flash-${tone}`} role={tone === "err" ? "alert" : "status"}>
      {children}
    </p>
  );
}

export type PillTone = "neutral" | "ok" | "warn" | "danger" | "accent";

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: PillTone }) {
  return <span className={`us-pill us-pill-${tone}`}>{children}</span>;
}

export function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className="us-stat">
      <p className="us-stat-label">{label}</p>
      <p className="us-stat-value">{value}</p>
      {note && <p className="us-stat-note">{note}</p>}
    </div>
  );
}
