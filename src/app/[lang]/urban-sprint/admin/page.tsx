import Link from "next/link";
import { Icon } from "@/app/components/Icons";
import {
  formatBookingDate,
  formatRinggit,
  formatSlotTime,
  malaysiaToday,
} from "@/lib/urban-sprint/booking-config";
import {
  getAvailability,
  getBookingStats,
  listAwaitingResults,
  listBookingsNeedingAttention,
  type StoredTeamBooking,
} from "@/lib/urban-sprint/bookings-db";
import { getActivityCounts } from "@/lib/urban-sprint/completions-db";
import { formatDuration, points } from "@/lib/urban-sprint/format";
import { getBoard } from "@/lib/urban-sprint/results-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import LiveRefresh from "../_components/LiveRefresh";
import RaceTimer from "../_components/RaceTimer";
import SlotGrid from "./SlotGrid";
import {
  AdminFlash,
  EmptyState,
  LiveBadge,
  PageHeader,
  Panel,
  Pill,
  RankBadge,
  StatGrid,
  Swatch,
  bookingHref,
} from "./ui";

/** How many days of the slot grid the overview shows — a week is what gets planned against. */
const WEEK = 7;

/**
 * The console's front page: what's booked, what needs doing, and how the
 * races are going. Every tile and list links through to the page where the
 * work actually happens.
 */
export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const today = malaysiaToday();

  const [settings, stats, availability, attention, awaiting, activity, board] = await Promise.all([
    getSettings(),
    getBookingStats(today),
    getAvailability(),
    listBookingsNeedingAttention(),
    listAwaitingResults(today),
    getActivityCounts(),
    getBoard(),
  ]);
  const racingNow = board.filter((row) => row.racing).length;

  const todo = [
    ...attention.map((booking) => ({ booking, kind: todoKind(booking) })),
    ...awaiting.slice(0, 8).map((booking) => ({ booking, kind: "result" as const })),
  ];

  return (
    <>
      <LiveRefresh revision={settings.revision} intervalMs={8000} />

      <PageHeader
        title="Overview"
        subtitle={`${settings.eventName} · ${settings.eventLocation}`}
        actions={
          <>
            {/* A file download, not a page: <Link> would try to route to it. */}
            <a className="ad-btn" href="/api/urban-sprint/export?kind=bookings" download>
              <Icon name="download" />
              Export bookings
            </a>
            <Link className="ad-btn ad-btn-primary" href="/urban-sprint/admin/results">
              <Icon name="flag" />
              Enter results
            </Link>
          </>
        }
      />

      <AdminFlash params={params} />

      <StatGrid
        stats={[
          {
            label: "Upcoming teams",
            value: stats.upcomingTeams,
            note: `${stats.upcomingRacers} racers from today on`,
          },
          { label: "Racing today", value: stats.todayTeams, note: formatBookingDate(today) },
          {
            label: "Awaiting results",
            value: stats.awaitingResults,
            note: stats.awaitingResults > 0 ? "raced, not scored yet" : "all scored",
            alert: stats.awaitingResults > 0,
          },
          {
            label: "Revenue",
            value: formatRinggit(stats.revenueCents),
            note: `${stats.paidTeams} paid team${stats.paidTeams === 1 ? "" : "s"}`,
          },
          {
            label: "Email issues",
            value: stats.emailIssues,
            note: stats.emailIssues > 0 ? "confirmation not delivered" : "every team confirmed",
            alert: stats.emailIssues > 0,
          },
        ]}
      />

      <div className="usc-grid">
        <div>
          <Panel
            title="The week ahead"
            icon="calendar"
            count={`teams per slot`}
            padded={false}
            actions={
              <Link className="ad-btn ad-btn-sm" href="/urban-sprint/admin/bookings">
                All bookings
              </Link>
            }
          >
            <SlotGrid days={availability.slice(0, WEEK)} />
          </Panel>

          <Panel title="Needs attention" icon="alert" count={String(todo.length)} padded={false}>
            {todo.length === 0 ? (
              <EmptyState icon="check" title="Nothing waiting">
                Every paid team has its confirmation, and every team that has raced has a result.
              </EmptyState>
            ) : (
              <ul className="usc-todo">
                {todo.map(({ booking, kind }) => (
                  <TodoItem key={`${kind}-${booking.id}`} booking={booking} kind={kind} />
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div>
          <Panel
            title="Leaderboard"
            icon="flag"
            padded={false}
            actions={
              <>
                <LiveBadge />
                <Link className="ad-btn ad-btn-sm" href="/urban-sprint/admin/leaderboard">
                  Full board
                </Link>
              </>
            }
          >
            <div className="ad-panel-body">
              <p className="ad-panel-note">
                <strong>{board.length}</strong> team{board.length === 1 ? "" : "s"} ranked ·{" "}
                <strong>{racingNow}</strong> racing now · <strong>{activity.valid}</strong> stations
                cleared
              </p>
            </div>
            {board.length === 0 ? (
              <EmptyState icon="flag" title="No teams on the board yet">
                A team joins the moment its gamemaster starts the race.
              </EmptyState>
            ) : (
              <div className="ad-table-scroll">
                <table className="ad-table">
                  <tbody>
                    {board.slice(0, 5).map((row) => (
                      <tr key={row.reference}>
                        <td>
                          <RankBadge rank={row.rank} />
                        </td>
                        <td>
                          <span className="ad-cell-stack">
                            <span className="usc-name">
                              {row.color && <Swatch color={row.color} />}
                              <Link className="usc-row-link" href={bookingHref(row.reference)}>
                                {row.teamName}
                              </Link>
                            </span>
                            <span>{row.racing ? "Racing now" : formatBookingDate(row.date)}</span>
                          </span>
                        </td>
                        <td className="is-num is-strong">{points(row.points)} pts</td>
                        <td className="is-num">
                          {row.racing && row.startedAt ? (
                            <RaceTimer startedAt={row.startedAt} />
                          ) : (
                            formatDuration(row.seconds)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

type TodoKind = "email" | "settling" | "result";

function todoKind(booking: StoredTeamBooking): TodoKind {
  return booking.status === "processing" ? "settling" : "email";
}

function TodoItem({ booking, kind }: { booking: StoredTeamBooking; kind: TodoKind }) {
  const race = `${formatBookingDate(booking.date)}, ${formatSlotTime(booking.time)}`;

  const copy = {
    email: {
      pill: <Pill label="Email not sent" tone="danger" />,
      note: booking.confirmationError ?? "The confirmation hasn't gone out yet.",
      action: "Open booking",
    },
    settling: {
      pill: <Pill label="Payment settling" tone="warn" />,
      note: "Checkout finished; the bank hasn't confirmed the money yet. The place is held.",
      action: "Open booking",
    },
    result: {
      pill: <Pill label="No result" tone="warn" />,
      note: `Raced ${race}.`,
      action: "Enter result",
    },
  }[kind];

  return (
    <li>
      {copy.pill}
      <span className="usc-todo-body">
        <b>
          {booking.teamName} <span className="usc-mono usc-muted">{booking.reference}</span>
        </b>
        <span>{copy.note}</span>
      </span>
      <Link className="ad-btn" href={bookingHref(booking.reference)}>
        {copy.action}
      </Link>
    </li>
  );
}
