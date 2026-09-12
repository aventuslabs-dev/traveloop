import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllBookings, type StoredBooking } from "@/lib/experience-bookings-db";
import { getAllOrders } from "@/lib/orders-db";
import { isAdminUser } from "@/lib/admin-auth";
import { isPastSession } from "@/lib/booking";
import { setBookingStatus } from "@/app/[lang]/admin/booking-actions";
import {
  formatDateLong,
  formatPrice,
  formatTimeRange,
  getExperience,
} from "@/app/data/experiences";
import { EmptyState, Flash, PageHeader, Panel, StatGrid, bookingTone } from "../ui";

export const metadata: Metadata = {
  title: "Admin · Experience bookings",
  robots: { index: false, follow: false },
};

type BookingsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/** The transitions worth offering from each state — cancelled is deliberately terminal. */
const NEXT_STATUSES: Record<StoredBooking["status"], StoredBooking["status"][]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const ACTION_LABELS: Record<StoredBooking["status"], string> = {
  pending: "Reopen",
  confirmed: "Confirm",
  completed: "Mark completed",
  cancelled: "Cancel",
};

const FILTERS = ["all", "pending", "confirmed", "completed", "cancelled"] as const;
type Filter = (typeof FILTERS)[number];

function isFilter(value: unknown): value is Filter {
  return typeof value === "string" && (FILTERS as readonly string[]).includes(value);
}

export default async function AdminBookingsPage({ searchParams }: BookingsPageProps) {
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const updated = typeof params.updated === "string" ? params.updated : null;
  const failed = params.error === "1";
  const filter: Filter = isFilter(params.status) ? params.status : "all";

  const [bookings, orders] = await Promise.all([getAllBookings(), getAllOrders()]);

  // One lookup pass instead of a query per booking — the admin list is small
  // enough that loading both tables and joining in memory is the cheap option.
  const customerBySession = new Map(orders.map((order) => [order.sessionId, order] as const));

  const counts = FILTERS.reduce<Record<Filter, number>>(
    (acc, key) => {
      acc[key] = key === "all" ? bookings.length : bookings.filter((b) => b.status === key).length;
      return acc;
    },
    { all: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 }
  );

  const upcoming = bookings.filter((b) => b.status !== "cancelled" && !isPastSession(b));
  const heads = bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + b.participants, 0);

  const visible = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <>
      <PageHeader
        title="Experience bookings"
        subtitle="Cultural sessions booked from the customer portal. Payment is collected at the venue."
      />

      {updated && <Flash tone="ok">Booking {updated} updated.</Flash>}
      {failed && <Flash tone="err">Couldn&apos;t update that booking.</Flash>}

      <StatGrid
        stats={[
          { label: "Total bookings", value: bookings.length },
          {
            label: "Awaiting confirmation",
            value: counts.pending,
            alert: counts.pending > 0,
            note: counts.pending > 0 ? "Customers are waiting on you" : "All caught up",
          },
          { label: "Upcoming sessions", value: upcoming.length },
          { label: "Participants booked", value: heads },
        ]}
      />

      <Panel padded={false}>
        <div className="ad-table-toolbar">
          <div className="ad-filters">
            {FILTERS.map((key) => (
              <Link
                key={key}
                className={`ad-filter${filter === key ? " is-active" : ""}`}
                href={key === "all" ? "/admin/bookings" : `/admin/bookings?status=${key}`}
                aria-current={filter === key ? "page" : undefined}
              >
                <span style={{ textTransform: "capitalize" }}>{key}</span>
                <span className="ad-filter-count">{counts[key]}</span>
              </Link>
            ))}
          </div>
          <span className="ad-table-count">
            {visible.length} booking{visible.length === 1 ? "" : "s"}
          </span>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={filter === "all" ? "No bookings yet" : `No ${filter} bookings`}
          >
            {filter === "all"
              ? "Bookings made from the customer portal will land here for confirmation."
              : "Try a different status filter."}
          </EmptyState>
        ) : (
          <div className="ad-table-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Update</th>
                  <th>Session</th>
                  <th>Experience</th>
                  <th className="is-num">Pax</th>
                  <th className="is-num">Payable</th>
                  <th>Customer</th>
                  <th>Pass</th>
                  <th>Customer note</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((booking) => {
                  const order = customerBySession.get(booking.orderSessionId);
                  const experience = getExperience(booking.experienceKey);
                  const packageLabel =
                    experience?.pricing.mode === "packages"
                      ? experience.pricing.options.find((o) => o.key === booking.packageKey)?.label
                      : experience?.pricing.mode === "per-person" &&
                          experience.pricing.groupPack?.key === booking.packageKey
                        ? experience.pricing.groupPack.label
                        : null;
                  const transitions = NEXT_STATUSES[booking.status];

                  return (
                    <tr key={booking.reference}>
                      <td className="is-mono">{booking.reference}</td>
                      <td>
                        <span className={`ad-pill ad-pill-${bookingTone(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td>
                        {transitions.length === 0 ? (
                          <span className="is-mono">—</span>
                        ) : (
                          <form className="ad-booking-actions" action={setBookingStatus}>
                            <input type="hidden" name="reference" value={booking.reference} />
                            <input
                              className="ad-note-input"
                              name="adminNotes"
                              type="text"
                              placeholder="Note to customer (optional)"
                              defaultValue={booking.adminNotes ?? ""}
                            />
                            {transitions.map((next) => (
                              <button
                                key={next}
                                type="submit"
                                name="status"
                                value={next}
                                className={`ad-btn${next === "cancelled" ? " ad-btn-danger" : " ad-btn-primary"}`}
                              >
                                {ACTION_LABELS[next]}
                              </button>
                            ))}
                          </form>
                        )}
                      </td>
                      <td>
                        <span className="ad-cell-stack">
                          <b>{formatDateLong(booking.sessionDate)}</b>
                          <span>{formatTimeRange(booking.startMinutes, booking.endMinutes)}</span>
                        </span>
                      </td>
                      <td>
                        <span className="ad-cell-stack">
                          <b>{booking.experienceName}</b>
                          {packageLabel && <span>{packageLabel}</span>}
                        </span>
                      </td>
                      <td className="is-num">
                        {booking.participants}
                        {booking.childrenCount > 0 && ` +${booking.childrenCount}c`}
                      </td>
                      <td className="is-num">{formatPrice(booking.quotedAmountCents)}</td>
                      <td>
                        <span className="ad-cell-stack">
                          <b>{order?.customerName ?? "—"}</b>
                          <span>{order?.customerEmail ?? "—"}</span>
                        </span>
                      </td>
                      <td>
                        <span className={`ad-tier ad-tier-${booking.passKey}`}>
                          {booking.passKey}
                        </span>
                      </td>
                      <td className="ad-note-cell">{booking.customerNotes ?? "—"}</td>
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
