import { redirect } from "next/navigation";
import { Icon } from "@/app/components/Icons";
import DataTable, { type Column, type Row } from "@/app/[lang]/admin/(dashboard)/DataTable";
import { requireRole } from "@/lib/urban-sprint/auth";
import {
  HOLD_MINUTES,
  formatBookingDate,
  formatSlotTime,
  malaysiaToday,
  normalizeBookingId,
} from "@/lib/urban-sprint/booking-config";
import {
  getAvailability,
  getBookingByReference,
  listBookings,
  searchBookings,
  type StoredTeamBooking,
} from "@/lib/urban-sprint/bookings-db";
import { formatDuration, points } from "@/lib/urban-sprint/format";
import SlotGrid from "../SlotGrid";
import { AdminFlash, BOOKING_STATUS, FilterLink, PageHeader, Panel, bookingHref } from "../ui";

const columns: Column[] = [
  { key: "race", label: "Race" },
  { key: "team", label: "Team" },
  { key: "size", label: "Racers", align: "right" },
  { key: "payer", label: "Paid by" },
  { key: "status", label: "Status" },
  { key: "email", label: "Confirmation" },
  { key: "result", label: "Result" },
  { key: "actions", label: "", sortable: false },
];

/**
 * Who's booked into which race. Upcoming or past, or one day from the slot
 * grid; the table filters as you type, and the Booking ID box jumps straight
 * to a booking from any date. Everything about one team — its racers, their
 * passes, its result — is on the booking's own page.
 *
 * Checks the role itself rather than leaning on the console layout, because
 * this page leads to identity numbers.
 */
export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireRole("admin");

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const date =
    typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : null;
  const view = params.view === "past" ? "past" : "upcoming";
  const today = malaysiaToday();

  // A typed Booking ID goes straight to its booking.
  const reference = query ? normalizeBookingId(query) : null;
  if (reference && (await getBookingByReference(reference))) {
    redirect(bookingHref(reference));
  }

  const [bookings, availability] = await Promise.all([
    query
      ? searchBookings(query)
      : date
        ? listBookings({ from: date, direction: "upcoming" }).then((rows) =>
            rows.filter((booking) => booking.date === date)
          )
        : listBookings({ from: today, direction: view }),
    getAvailability(),
  ]);

  const paid = bookings.filter((booking) => booking.status === "paid");
  const racers = paid.reduce((sum, booking) => sum + booking.teamSize, 0);

  const heading = query
    ? `Matching “${query}”`
    : date
      ? formatBookingDate(date)
      : view === "upcoming"
        ? "Upcoming races"
        : "Past races";

  return (
    <>
      <PageHeader
        title="Bookings"
        subtitle={`${paid.length} paid team${paid.length === 1 ? "" : "s"} · ${racers} racers${
          !query && !date && view === "upcoming"
            ? ` · teams at checkout hold their place for up to ${HOLD_MINUTES} minutes`
            : ""
        }`}
        actions={
          <a className="ad-btn" href="/api/urban-sprint/export?kind=bookings" download>
            <Icon name="download" />
            Export CSV
          </a>
        }
      />

      <AdminFlash params={params} />

      <div className="usc-toolbar">
        <nav className="ad-filters" aria-label="Which bookings">
          <FilterLink href="/urban-sprint/admin/bookings" active={!query && !date && view === "upcoming"}>
            Upcoming
          </FilterLink>
          <FilterLink href="/urban-sprint/admin/bookings?view=past" active={!query && !date && view === "past"}>
            Past
          </FilterLink>
          {date && (
            <FilterLink href={`/urban-sprint/admin/bookings?date=${date}`} active>
              {formatBookingDate(date)}
            </FilterLink>
          )}
          {query && (
            <FilterLink href={`/urban-sprint/admin/bookings?q=${encodeURIComponent(query)}`} active>
              Search
            </FilterLink>
          )}
        </nav>

        <form className="usc-find" action="/urban-sprint/admin/bookings" method="get" role="search">
          <label className="ad-search">
            <Icon name="search" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Booking ID or team name, any date"
              aria-label="Find a booking by Booking ID or team name"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button className="ad-btn" type="submit">
            Find
          </button>
        </form>
      </div>

      {!query && !date && view === "upcoming" && (
        <Panel title="The week ahead" icon="calendar" count="teams per slot" padded={false}>
          <SlotGrid days={availability.slice(0, 7)} />
        </Panel>
      )}

      <Panel title={heading} icon="users" padded={false}>
        <DataTable
          columns={columns}
          rows={bookings.map(toRow)}
          noun="booking"
          searchPlaceholder="Filter by team, ID, payer…"
          emptyIcon="calendar"
          emptyTitle={query ? "No booking matches" : "No bookings here yet"}
          emptyBody={
            query
              ? "Check the Booking ID on the team's confirmation email."
              : "Paid teams appear here as soon as Stripe confirms their payment."
          }
        />
      </Panel>
    </>
  );
}

function toRow(booking: StoredTeamBooking): Row {
  const status = BOOKING_STATUS[booking.status];
  const scored = booking.resultPoints !== null && booking.resultSeconds !== null;

  return {
    id: String(booking.id),
    searchText: `${booking.reference} ${booking.payerEmail ?? ""} ${booking.participants
      .map((person) => person.fullName)
      .join(" ")}`,
    cells: {
      race: {
        kind: "stack",
        primary: formatBookingDate(booking.date),
        secondary: formatSlotTime(booking.time),
        sortValue: `${booking.date} ${booking.time}`,
      },
      team: {
        kind: "stack",
        primary: booking.teamName,
        secondary: booking.reference,
        href: bookingHref(booking.reference),
      },
      size: { kind: "num", value: booking.teamSize, display: String(booking.teamSize) },
      payer: {
        kind: "stack",
        primary: booking.payerName ?? "—",
        secondary: booking.payerEmail ?? undefined,
      },
      status: { kind: "pill", label: status.label, tone: status.tone },
      email:
        booking.status !== "paid"
          ? { kind: "text", value: "—" }
          : booking.confirmationSentAt
            ? { kind: "pill", label: "Sent", tone: "success" }
            : booking.confirmationError
              ? { kind: "pill", label: "Not delivered", tone: "danger" }
              : { kind: "pill", label: "Pending", tone: "warn" },
      result: scored
        ? {
            kind: "stack",
            primary: `${points(booking.resultPoints ?? 0)} pts`,
            secondary: formatDuration(booking.resultSeconds ?? 0),
            sortValue: booking.resultPoints ?? 0,
          }
        : { kind: "text", value: "—", sortValue: -1 },
      actions: {
        kind: "actions",
        items: [{ href: bookingHref(booking.reference), icon: "eye", label: "Open booking" }],
      },
    },
  };
}
