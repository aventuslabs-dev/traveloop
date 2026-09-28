import Image from "next/image";
import Link from "next/link";
import { ordinal, percent, points } from "@/lib/urban-sprint/format";
import type { EventStatus } from "@/lib/urban-sprint/types";

/** The logo for dark grounds: its navy letters white, its batik V and aeroplane untouched. */
const LOGO_ON_DARK = "/traveloop-logo-white.webp";

/* Presentational primitives for Urban Sprint. All server-safe, so pages stay
   Server Components and the only client code in the product is the handful of
   pieces that genuinely need interaction. */

/**
 * The campaign lockup: the Traveloop logo in front, URBAN SPRINT behind it.
 *
 * The campaign exists to sell the pass, so the brand leads and the event sits
 * underneath: a single filled line tucked under the logo, for bars and
 * footers. (The landing page's poster carries its own, larger lockup.)
 *
 * `tone` follows the ground: on navy the letters go white and the batik V
 * and aeroplane keep their colours (LOGO_ON_DARK); on cream it is the logo
 * as it comes.
 */
export function Wordmark({
  href = "/urban-sprint",
  tone = "dark",
  label = "Traveloop Urban Sprint home",
}: {
  href?: string;
  tone?: "dark" | "light";
  label?: string;
}) {
  const className = `us-lockup us-lockup-sm is-${tone}`;
  const body = (
    <>
      <span className="us-lockup-back" aria-hidden>
        Urban Sprint
      </span>
      <Image
        className="us-lockup-logo"
        src={tone === "dark" ? LOGO_ON_DARK : "/traveloop-logo.webp"}
        alt=""
        width={1280}
        height={345}
        sizes="150px"
      />
    </>
  );

  return (
    <Link className={className} href={href} aria-label={label}>
      {body}
    </Link>
  );
}

/**
 * The same lockup at poster size, for the entrance's sky and its loading
 * screen. Not a link, and hidden from assistive tech: the heading or dialog
 * around it names the campaign in words.
 */
export function LockupLarge() {
  return (
    <span className="us-lockup us-lockup-lg is-dark" aria-hidden>
      <span className="us-lockup-back">Urban Sprint</span>
      <Image
        className="us-lockup-logo"
        src={LOGO_ON_DARK}
        alt=""
        width={1280}
        height={345}
        sizes="(min-width: 1024px) 700px, 70vw"
        loading="eager"
      />
    </span>
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
