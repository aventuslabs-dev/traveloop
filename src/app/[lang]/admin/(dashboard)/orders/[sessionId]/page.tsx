import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrderBySessionId } from "@/lib/orders-db";
import { getPassRegistrationsByOrder } from "@/lib/pass-registrations-db";
import { isAdminUser } from "@/lib/admin-auth";
import { formatPassNumber } from "@/lib/pass-number";
import {
  EmptyState,
  Flash,
  PageHeader,
  Panel,
  Pill,
  Tier,
  formatDay,
  formatDayTime,
  money,
} from "../../ui";
import { resendReceipt } from "../order-actions";

export const metadata: Metadata = {
  title: "Admin · Order registrations",
  robots: { index: false, follow: false },
};

type OrderDetailPageProps = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const ERRORS: Record<string, string> = {
  noemail: "This order has no email address on it, so there's nowhere to send the receipt.",
  send: "That receipt still wouldn't send. The reason is below — try again once it's fixed.",
};

export default async function AdminOrderDetailPage({ params, searchParams }: OrderDetailPageProps) {
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) {
    redirect("/admin/login");
  }

  const { sessionId } = await params;
  const order = await getOrderBySessionId(sessionId);
  if (!order) {
    notFound();
  }

  const query = await searchParams;
  const sent = query.sent === "1";
  const error = typeof query.error === "string" ? ERRORS[query.error] : null;

  const registrations = await getPassRegistrationsByOrder(sessionId);
  const race = order.product.kind === "urban_sprint" ? order.product : null;

  return (
    <>
      <PageHeader
        backHref="/admin"
        backLabel="All orders"
        title={order.invoiceNumber || "Order"}
        subtitle={`${order.customerName ?? "Guest"} · ${
          race ? `Urban Sprint team · ${order.quantity} Platinum Passes` : `${order.quantity} pass${order.quantity === 1 ? "" : "es"}`
        }`}
        actions={
          <a
            className="ad-btn"
            href={`/api/orders/${order.sessionId}/invoice?format=pdf`}
          >
            Download invoice
          </a>
        }
      />

      {sent && <Flash tone="ok">Receipt sent to {order.customerEmail}.</Flash>}
      {error && <Flash tone="err">{error}</Flash>}

      <Panel
        title="Order"
        icon="receipt"
        footer={
          <form action={resendReceipt}>
            <input type="hidden" name="sessionId" value={order.sessionId} />
            <button className="ad-btn ad-btn-primary" type="submit" disabled={!order.customerEmail}>
              {order.confirmationSentAt ? "Send receipt again" : "Send receipt now"}
            </button>
          </form>
        }
      >
        <dl className="ad-dl">
          <div>
            <dt>Invoice</dt>
            <dd>{order.invoiceNumber || "—"}</dd>
          </div>
          <div>
            <dt>Placed</dt>
            <dd>{formatDay(order.createdAt)}</dd>
          </div>
          <div>
            <dt>Product</dt>
            <dd>{race ? "Urban Sprint team entry" : "Premier Pass"}</dd>
          </div>
          {race && (
            <>
              <div>
                <dt>Booking ID</dt>
                <dd>
                  {/* The Urban Sprint console has the slot, the team and its result. */}
                  <Link
                    className="ad-link is-mono"
                    href={`/urban-sprint/admin/bookings?q=${encodeURIComponent(race.reference)}`}
                  >
                    {race.reference}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Race</dt>
                <dd>{race.description}</dd>
              </div>
            </>
          )}
          <div>
            <dt>Pass</dt>
            <dd>
              {race ? (
                <span className="ad-cell-stack">
                  <Tier name="Platinum" />
                  <span>Included for every racer</span>
                </span>
              ) : (
                <Tier name={order.passName} />
              )}
            </dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{money(order.amountTotal, order.currency)}</dd>
          </div>
          {(order.discount.automaticCents > 0 || order.discount.codeCents > 0) && (
            <div>
              <dt>Discounts</dt>
              <dd>
                <span className="ad-cell-stack">
                  {order.discount.automaticCents > 0 && (
                    <span>
                      {order.discount.automaticLabel ?? "Automatic"} −
                      {money(order.discount.automaticCents, order.currency)}
                    </span>
                  )}
                  {order.discount.codeCents > 0 && (
                    <span>
                      {order.discount.codeId ? (
                        <Link className="ad-link" href={`/admin/discounts/${order.discount.codeId}`}>
                          {order.discount.codeLabel ?? order.discount.code}
                        </Link>
                      ) : (
                        (order.discount.codeLabel ?? order.discount.code)
                      )}{" "}
                      −{money(order.discount.codeCents, order.currency)}
                    </span>
                  )}
                </span>
              </dd>
            </div>
          )}
          <div>
            <dt>Customer</dt>
            <dd>{order.customerName ?? "—"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{order.customerEmail ?? "—"}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{order.customerPhone ?? "—"}</dd>
          </div>
          <div>
            <dt>Trip dates</dt>
            <dd>
              {order.arrivalDate && order.departureDate
                ? `${formatDay(order.arrivalDate)} – ${formatDay(order.departureDate)}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Stripe session</dt>
            <dd className="is-mono">{order.sessionId}</dd>
          </div>
          <div>
            <dt>Payment intent</dt>
            <dd className="is-mono">{order.paymentIntentId ?? "—"}</dd>
          </div>
          {/* The receipt is the one part of fulfilment that can fail on its
              own after the money is taken, so it reports its own state. */}
          <div>
            <dt>Receipt</dt>
            <dd>
              {order.confirmationSentAt ? (
                <span className="ad-cell-stack">
                  <Pill label="Sent" tone="success" />
                  <span>{formatDayTime(order.confirmationSentAt)}</span>
                </span>
              ) : (
                <span className="ad-cell-stack">
                  <Pill
                    label={order.confirmationError ? "Not delivered" : "Pending"}
                    tone={order.confirmationError ? "danger" : "warn"}
                  />
                  <span>{order.confirmationError ?? "No receipt has gone out yet."}</span>
                </span>
              )}
            </dd>
          </div>
        </dl>
      </Panel>

      <Panel
        title={race ? "Racer registrations" : "Traveller registrations"}
        icon="users"
        count={`${registrations.length} of ${order.quantity}`}
        padded={false}
      >
        {registrations.length === 0 ? (
          <EmptyState icon="users" title="No registration details on file">
            This order predates per-traveller registration, or the checkout draft expired before
            fulfilment ran.
          </EmptyState>
        ) : (
          <div className="ad-table-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pass No.</th>
                  <th>Pass</th>
                  <th>Traveller</th>
                  <th>Nationality</th>
                  <th>Document</th>
                  <th>Arrival</th>
                  <th>Departure</th>
                  <th>Emergency contact</th>
                  <th>Collection</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg, index) => (
                  <tr key={reg.id}>
                    <td className="is-mono">{index + 1}</td>
                    <td className="is-mono">
                      {reg.passNumber ? (
                        <Link className="ad-link" href={`/admin/passes/${reg.passNumber}`}>
                          {formatPassNumber(reg.passNumber)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <Tier name={reg.passName} />
                    </td>
                    <td className="is-strong">{reg.fullName}</td>
                    <td>{reg.nationality}</td>
                    <td>
                      <span className="ad-cell-stack">
                        <b>{reg.travelDocumentNumber}</b>
                        <span>{reg.travelDocumentType}</span>
                      </span>
                    </td>
                    <td>{formatDay(reg.arrivalDate)}</td>
                    <td>{formatDay(reg.departureDate)}</td>
                    <td>
                      {reg.emergencyContactName ? (
                        <span className="ad-cell-stack">
                          <b>{reg.emergencyContactName}</b>
                          <span>
                            {reg.emergencyContactRelationship ?? "—"} ·{" "}
                            {reg.emergencyContactPhone ?? "—"}
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {reg.collectedAt ? (
                        <span className="ad-cell-stack">
                          <Pill label="Collected" tone="success" />
                          <span>{formatDay(reg.collectedAt)}</span>
                        </span>
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
    </>
  );
}
