import Link from "next/link";
import { Icon } from "@/app/components/Icons";
import { requireRole } from "@/lib/urban-sprint/auth";
import {
  formatBookingDate,
  formatSlotTime,
  malaysiaToday,
  photoFolderName,
} from "@/lib/urban-sprint/booking-config";
import { listAwaitingResults } from "@/lib/urban-sprint/bookings-db";
import { formatDuration, points } from "@/lib/urban-sprint/format";
import { getResults } from "@/lib/urban-sprint/results-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import LiveRefresh from "../../_components/LiveRefresh";
import { setResultAction } from "../actions";
import Dialog from "../Dialog";
import ResultForm from "../ResultForm";
import { AdminFlash, EmptyState, PageHeader, Panel, RankBadge, StatGrid, bookingHref } from "../ui";

const RETURN_TO = "/urban-sprint/admin/results";

/**
 * Where staff record how each team did: total points and completion time
 * against a Booking ID. The ranking follows from the database view — more
 * points first, then the shorter time — and the public board reads the same.
 */
export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireRole("admin");
  const params = await searchParams;

  const [settings, ranking, awaiting] = await Promise.all([
    getSettings(),
    getResults(),
    listAwaitingResults(malaysiaToday()),
  ]);

  const best = ranking[0];

  return (
    <>
      <LiveRefresh revision={settings.revision} intervalMs={8000} />

      <PageHeader
        title="Results"
        subtitle="Results are recorded automatically when a gamemaster finishes a race. Use this page to enter one the game didn't record, or to correct one."
        actions={
          <>
            <a className="ad-btn" href="/api/urban-sprint/export?kind=results" download>
              <Icon name="download" />
              Export CSV
            </a>
            <Link className="ad-btn" href="/urban-sprint#leaderboard" target="_blank">
              <Icon name="external" />
              Public board
            </Link>
          </>
        }
      />

      <AdminFlash params={params} />

      <StatGrid
        stats={[
          { label: "Teams ranked", value: ranking.length },
          {
            label: "Awaiting a result",
            value: awaiting.length,
            note: awaiting.length > 0 ? "raced, not scored" : "all scored",
            alert: awaiting.length > 0,
          },
          {
            label: "Leading",
            value: best ? `${points(best.points)} pts` : "—",
            note: best ? `${best.teamName} · ${formatDuration(best.seconds)}` : "no results yet",
          },
        ]}
      />

      <Panel title="Enter or correct a result" icon="flag">
        <p className="ad-panel-note">
          Type the Booking ID from the team&rsquo;s confirmation. The team name comes from the
          booking, so a result can&rsquo;t be filed under a misspelling. Time is minutes:seconds, or
          hours:minutes:seconds.
        </p>
        <form className="usc-inline-form" action={setResultAction}>
          <input type="hidden" name="returnTo" value={RETURN_TO} />
          <label className="admin-field">
            <span>Booking ID</span>
            <input
              name="reference"
              placeholder="US-ABCD1234"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
            />
          </label>
          <label className="admin-field">
            <span>Total points</span>
            <input name="points" type="number" min="0" step="any" inputMode="decimal" required />
          </label>
          <label className="admin-field">
            <span>Completion time</span>
            <input name="time" placeholder="58:12" inputMode="numeric" autoComplete="off" required />
          </label>
          <button className="ad-btn ad-btn-primary" type="submit">
            Save result
          </button>
        </form>
      </Panel>

      <Panel title="Waiting for a result" icon="clock" count={String(awaiting.length)} padded={false}>
        {awaiting.length === 0 ? (
          <EmptyState icon="check" title="All caught up">
            Every paid team that has raced has a result.
          </EmptyState>
        ) : (
          <div className="ad-table-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Race</th>
                  <th>Team</th>
                  <th>Photo folder</th>
                  <th className="is-num">Score</th>
                </tr>
              </thead>
              <tbody>
                {awaiting.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <span className="ad-cell-stack">
                        <b>{formatBookingDate(booking.date)}</b>
                        <span>{formatSlotTime(booking.time)}</span>
                      </span>
                    </td>
                    <td>
                      <span className="ad-cell-stack">
                        <Link className="ad-link" href={bookingHref(booking.reference)}>
                          {booking.teamName}
                        </Link>
                        <span>{booking.reference}</span>
                      </span>
                    </td>
                    <td className="is-mono">{photoFolderName(booking.reference, booking.teamName)}</td>
                    <td className="is-actions">
                      <Dialog
                        label="Enter score"
                        variant="small"
                        title={`Result for ${booking.teamName}`}
                        description={`${booking.reference} · ${formatBookingDate(booking.date)}, ${formatSlotTime(booking.time)}`}
                      >
                        <ResultForm
                          bookingId={booking.id}
                          reference={booking.reference}
                          resultPoints={null}
                          resultSeconds={null}
                          returnTo={RETURN_TO}
                        />
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Ranking" icon="table" count={String(ranking.length)} padded={false}>
        {ranking.length === 0 ? (
          <EmptyState icon="flag" title="No results entered yet">
            Teams rank here as soon as their first result is saved.
          </EmptyState>
        ) : (
          <div className="ad-table-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>Race</th>
                  <th className="is-num">Points</th>
                  <th className="is-num">Time</th>
                  <th className="is-num">Edit</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((row) => (
                  <tr key={row.bookingId}>
                    <td>
                      <RankBadge rank={row.rank} />
                    </td>
                    <td>
                      <span className="ad-cell-stack">
                        <Link className="ad-link" href={bookingHref(row.reference)}>
                          {row.teamName}
                        </Link>
                        <span>
                          {row.reference} · {row.teamSize} racers
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className="ad-cell-stack">
                        <b>{formatBookingDate(row.date)}</b>
                        <span>{formatSlotTime(row.time)}</span>
                      </span>
                    </td>
                    <td className="is-num is-strong">{points(row.points)}</td>
                    <td className="is-num is-strong">{formatDuration(row.seconds)}</td>
                    <td className="is-actions">
                      <Dialog
                        label="Edit"
                        variant="small"
                        title={`Result for ${row.teamName}`}
                        description={`${row.reference} · currently ranked ${row.rank}`}
                      >
                        <ResultForm
                          bookingId={row.bookingId}
                          reference={row.reference}
                          resultPoints={row.points}
                          resultSeconds={row.seconds}
                          returnTo={RETURN_TO}
                        />
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
