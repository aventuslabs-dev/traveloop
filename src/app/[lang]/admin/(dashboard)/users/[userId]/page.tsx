import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-auth";
import { getCustomerAccount, getDeletionImpact } from "@/lib/customer-accounts-db";
import { getCustomerProfile } from "@/lib/customer-profile-db";
import { getOrdersByUserId } from "@/lib/orders-db";
import { getPassRegistrationsByOrders } from "@/lib/pass-registrations-db";
import { formatPassNumber } from "@/lib/pass-number";
import { getBookingsByUserId } from "@/lib/experience-bookings-db";
import { formatDateLong, formatTimeRange } from "@/app/data/experiences";
import { saveCustomer, deleteCustomer } from "@/app/[lang]/admin/user-actions";
import {
  EmptyState,
  Flash,
  PageHeader,
  Panel,
  Pill,
  StatGrid,
  Tier,
  bookingTone,
  formatDay,
  formatDayTime,
  money,
} from "../../ui";
import ProfileFields from "./ProfileFields";
import PasswordReset from "./PasswordReset";

export const metadata: Metadata = {
  title: "Admin · Customer account",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const ERRORS: Record<string, string> = {
  email: "That doesn't look like a valid email address.",
  duplicate: "Another account already uses that email.",
  save: "Couldn't save those changes. Please try again.",
  confirm: "The email you typed didn't match, so nothing was deleted.",
  delete: "Couldn't delete that account. Please try again.",
};

export default async function AdminCustomerDetailPage({ params, searchParams }: PageProps) {
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) {
    redirect("/admin/login");
  }

  const { userId } = await params;
  const account = await getCustomerAccount(userId);
  if (!account) {
    notFound();
  }

  const query = await searchParams;
  const saved = query.saved === "1";
  const error = typeof query.error === "string" ? ERRORS[query.error] : null;

  const [profile, orders, bookings, impact] = await Promise.all([
    getCustomerProfile(userId),
    getOrdersByUserId(userId),
    getBookingsByUserId(userId),
    getDeletionImpact(userId),
  ]);

  // By this account's orders rather than the registration's own user_id,
  // which goes stale when an order is re-linked (getPassRegistrationsByOrders).
  const passes = await getPassRegistrationsByOrders(orders.map((order) => order.sessionId));
  const invoiceFor = new Map(orders.map((order) => [order.sessionId, order.invoiceNumber]));

  const spend = orders.reduce((sum, order) => sum + order.amountTotal, 0);
  const currency = orders[0]?.currency ?? "myr";

  return (
    <>
      <PageHeader
        backHref="/admin/users"
        backLabel="All customers"
        title={account.fullName ?? account.email}
        subtitle={account.fullName ? account.email : undefined}
      />

      {saved && <Flash tone="ok">Changes saved.</Flash>}
      {error && <Flash tone="err">{error}</Flash>}

      <StatGrid
        stats={[
          { label: "Orders", value: orders.length },
          { label: "Lifetime value", value: money(spend, currency) },
          { label: "Bookings", value: bookings.length },
          {
            label: "Last sign-in",
            value: account.lastSignInAt ? formatDay(account.lastSignInAt) : "Never",
            note: `Joined ${formatDay(account.createdAt)}`,
          },
        ]}
      />

      <form action={saveCustomer}>
        <input type="hidden" name="userId" value={userId} />
        <Panel
          title="Account & profile"
          icon="user"
          footer={
            <button className="ad-btn ad-btn-primary" type="submit">
              Save changes
            </button>
          }
        >
          <p className="ad-panel-note">
            Captured at checkout and used for Tokio Marine insurance registration. Changing the
            email also re-links any orders paid under the new address.
          </p>
          <ProfileFields email={account.email} profile={profile} />
        </Panel>
      </form>

      <PasswordReset userId={userId} />

      <Panel title="Orders" icon="receipt" count={`${orders.length}`} padded={false}>
        {orders.length === 0 ? (
          <EmptyState icon="receipt" title="No orders linked">
            Orders are linked by email address at the time of purchase.
          </EmptyState>
        ) : (
          <div className="ad-table-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Pass</th>
                  <th className="is-num">Total</th>
                  <th>Trip</th>
                  <th>Stripe session</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.sessionId}>
                    <td className="is-strong">{order.invoiceNumber || "—"}</td>
                    <td>{formatDay(order.createdAt)}</td>
                    <td>
                      <Tier name={order.passName} />
                    </td>
                    <td className="is-num">{money(order.amountTotal, order.currency)}</td>
                    <td>
                      {order.arrivalDate && order.departureDate
                        ? `${formatDay(order.arrivalDate)} – ${formatDay(order.departureDate)}`
                        : "—"}
                    </td>
                    <td className="is-mono">
                      <span className="ad-truncate" title={order.sessionId}>
                        {order.sessionId}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Passes" icon="ticket" count={`${passes.length}`} padded={false}>
        {passes.length === 0 ? (
          <EmptyState icon="ticket" title="No passes">
            Passes are issued per traveller when an order is paid.
          </EmptyState>
        ) : (
          <div className="ad-table-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Pass No.</th>
                  <th>Traveller</th>
                  <th>Pass</th>
                  <th>Invoice</th>
                  <th>Collection</th>
                </tr>
              </thead>
              <tbody>
                {passes.map((pass) => (
                  <tr key={pass.id}>
                    <td className="is-mono">
                      {pass.passNumber ? (
                        <Link className="ad-link" href={`/admin/passes/${pass.passNumber}`}>
                          {formatPassNumber(pass.passNumber)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="is-strong">{pass.fullName}</td>
                    <td>
                      <Tier name={pass.passName} />
                    </td>
                    <td>
                      <Link className="ad-link" href={`/admin/orders/${pass.orderSessionId}`}>
                        {invoiceFor.get(pass.orderSessionId) || "View order"}
                      </Link>
                    </td>
                    <td>
                      {pass.collectedAt ? (
                        <Pill label={`Collected ${formatDay(pass.collectedAt)}`} tone="success" />
                      ) : (
                        <Pill label="Awaiting" tone="warn" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Experience bookings" icon="calendar" count={`${bookings.length}`} padded={false}>
        {bookings.length === 0 ? (
          <EmptyState icon="calendar" title="No bookings">
            This customer hasn&apos;t booked a cultural experience yet.
          </EmptyState>
        ) : (
          <div className="ad-table-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Experience</th>
                  <th>Session</th>
                  <th className="is-num">Pax</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.reference}>
                    <td className="is-mono">{booking.reference}</td>
                    <td className="is-strong">{booking.experienceName}</td>
                    <td>
                      <span className="ad-cell-stack">
                        <b>{formatDateLong(booking.sessionDate)}</b>
                        <span>{formatTimeRange(booking.startMinutes, booking.endMinutes)}</span>
                      </span>
                    </td>
                    <td className="is-num">{booking.participants}</td>
                    <td>
                      <span className={`ad-pill ad-pill-${bookingTone(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <form action={deleteCustomer}>
        <input type="hidden" name="userId" value={userId} />
        <Panel
          title="Delete this account"
          icon="alert"
          tone="danger"
          footer={
            <button className="ad-btn ad-btn-danger" type="submit">
              Delete account
            </button>
          }
        >
          <p className="ad-panel-note">
            Permanently deletes the sign-in and profile, and{" "}
            <strong>
              {impact.bookings} booking{impact.bookings === 1 ? "" : "s"}
            </strong>{" "}
            along with them. The{" "}
            <strong>
              {impact.orders} order{impact.orders === 1 ? "" : "s"}
            </strong>{" "}
            and their invoices are kept for your records, but stop being linked to any account.
            This cannot be undone.
          </p>
          <p className="ad-panel-note">
            To confirm, type <strong>{account.email}</strong> below.
          </p>
          <label className="admin-field" style={{ maxWidth: "340px" }}>
            <span>Confirm sign-in email</span>
            <input name="confirmEmail" type="text" autoComplete="off" required />
          </label>
        </Panel>
      </form>

      <p className="ad-head-sub">
        Account created {formatDayTime(account.createdAt)}.
      </p>
    </>
  );
}
