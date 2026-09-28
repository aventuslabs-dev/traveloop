import Link from "next/link";
import {
  EmptyState,
  Flash,
  PageHeader,
  Panel,
  Pill,
  StatGrid,
  formatDay,
  formatDayTime,
  type PillTone,
  type Stat,
} from "@/app/[lang]/admin/(dashboard)/ui";
import type { BookingStatus } from "@/lib/urban-sprint/bookings-db";

/* The console speaks the Traveloop admin's layout language, so its page
   header, stat tiles, panels, pills and empty states are those components
   rather than look-alikes. What follows is only what Urban Sprint adds. */

export { EmptyState, Flash, PageHeader, Panel, Pill, StatGrid, formatDay, formatDayTime };
export type { PillTone, Stat };

/**
 * Renders the flash carried back by an action's redirect. Keeping the message
 * in the URL is what lets every console form be a plain server-action form.
 */
export function AdminFlash({
  params,
}: {
  params: { [key: string]: string | string[] | undefined };
}) {
  const message = typeof params.msg === "string" ? params.msg : null;
  if (!message) return null;
  return <Flash tone={params.tone === "err" ? "err" : "ok"}>{message}</Flash>;
}

/** Operator-chosen colour (team, category), as a small square. */
export function Swatch({ color }: { color: string }) {
  return <span className="usc-swatch" style={{ background: color }} aria-hidden />;
}

/** The "updating live" marker. Purely a signal — LiveRefresh does the work. */
export function LiveBadge({ label = "Live" }: { label?: string }) {
  return (
    <span className="usc-live">
      <i aria-hidden />
      {label}
    </span>
  );
}

export function RankBadge({ rank }: { rank: number }) {
  return <span className={`usc-rank${rank <= 3 ? ` is-${rank}` : ""}`}>{rank}</span>;
}

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: PillTone }> = {
  paid: { label: "Paid", tone: "success" },
  processing: { label: "Payment settling", tone: "warn" },
  pending: { label: "At checkout", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
  expired: { label: "Abandoned", tone: "neutral" },
  failed: { label: "Payment failed", tone: "danger" },
};

/** A booking's detail page. The Booking ID is the key staff already quote. */
export function bookingHref(reference: string): string {
  return `/urban-sprint/admin/bookings/${reference}`;
}

/** One of a page's view tabs (Upcoming, Past…), as a link so each view has a URL. */
export function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link className={`ad-filter${active ? " is-active" : ""}`} href={href} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
