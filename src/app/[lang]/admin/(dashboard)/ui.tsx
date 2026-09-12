import Link from "next/link";
import { Icon } from "@/app/components/Icons";

/* Presentational primitives shared by every console page, so a new screen
   inherits the layout language instead of inventing one. All server-safe. */

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="ad-head">
      <div>
        {backHref && (
          <Link className="ad-head-crumb" href={backHref}>
            ← {backLabel ?? "Back"}
          </Link>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="ad-head-sub">{subtitle}</p>}
      </div>
      {actions && <div className="ad-head-actions">{actions}</div>}
    </header>
  );
}

export type Stat = {
  label: string;
  value: string | number;
  note?: string;
  /** Draws attention when the number means something needs doing. */
  alert?: boolean;
};

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="ad-stats">
      {stats.map((stat) => (
        <div className={`ad-stat${stat.alert ? " is-alert" : ""}`} key={stat.label}>
          <p className="ad-stat-label">{stat.label}</p>
          <p className="ad-stat-value">{stat.value}</p>
          {stat.note && <p className="ad-stat-note">{stat.note}</p>}
        </div>
      ))}
    </div>
  );
}

export function Panel({
  title,
  icon,
  count,
  tone,
  actions,
  footer,
  padded = true,
  children,
}: {
  title?: string;
  icon?: string;
  count?: string;
  tone?: "danger" | "success";
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  /** Off for tables, which supply their own edge-to-edge padding. */
  padded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`ad-panel${tone ? ` is-${tone}` : ""}`}>
      {title && (
        <div className="ad-panel-head">
          <h2 className="ad-panel-title">
            {icon && <Icon name={icon} />}
            {title}
          </h2>
          {count && <span className="ad-panel-count">{count}</span>}
          {actions}
        </div>
      )}
      {padded ? <div className="ad-panel-body">{children}</div> : children}
      {footer && <div className="ad-panel-foot">{footer}</div>}
    </section>
  );
}

export function Flash({ tone, children }: { tone: "ok" | "err"; children: React.ReactNode }) {
  return (
    <p className={`ad-flash ad-flash-${tone}`} role={tone === "err" ? "alert" : "status"}>
      <Icon name={tone === "ok" ? "check" : "alert"} />
      {children}
    </p>
  );
}

export function EmptyState({
  icon = "search",
  title,
  children,
}: {
  icon?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="ad-empty">
      <span className="ad-empty-icon">
        <Icon name={icon} />
      </span>
      <p>
        <strong>{title}</strong>
        {children}
      </p>
    </div>
  );
}

export type PillTone = "neutral" | "success" | "warn" | "danger" | "info";

const BOOKING_TONES: Record<string, PillTone> = {
  pending: "warn",
  confirmed: "success",
  completed: "neutral",
  cancelled: "danger",
};

export function bookingTone(status: string): PillTone {
  return BOOKING_TONES[status] ?? "neutral";
}

export function Pill({ label, tone = "neutral" }: { label: string; tone?: PillTone }) {
  return <span className={`ad-pill ad-pill-${tone}`}>{label}</span>;
}

export function Tier({ name }: { name: string }) {
  return <span className={`ad-tier ad-tier-${name.toLowerCase()}`}>{name}</span>;
}

/** Short, sortable date — the console shows a lot of them, so no seconds. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDayTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function money(cents: number, currency: string): string {
  return `${currency.toUpperCase()} ${(cents / 100).toFixed(2)}`;
}
