import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrderBySessionId } from "@/lib/orders-db";
import { getPassRegistrationsByOrder } from "@/lib/pass-registrations-db";
import { isAdminUser } from "@/lib/admin-auth";
import { EmptyState, PageHeader, Panel, Tier, formatDay, money } from "../../ui";

export const metadata: Metadata = {
  title: "Admin · Order registrations",
  robots: { index: false, follow: false },
};

type OrderDetailPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function AdminOrderDetailPage({ params }: OrderDetailPageProps) {
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) {
    redirect("/admin/login");
  }

  const { sessionId } = await params;
  const order = await getOrderBySessionId(sessionId);
  if (!order) {
    notFound();
  }

  const registrations = await getPassRegistrationsByOrder(sessionId);

  return (
    <>
      <PageHeader
        backHref="/admin"
        backLabel="All orders"
        title={order.invoiceNumber || "Order"}
        subtitle={`${order.customerName ?? "Guest"} · ${order.quantity} pass${
          order.quantity === 1 ? "" : "es"
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

      <Panel title="Order" icon="receipt">
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
            <dt>Pass</dt>
            <dd>
              <Tier name={order.passName} />
            </dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{money(order.amountTotal, order.currency)}</dd>
          </div>
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
        </dl>
      </Panel>

      <Panel
        title="Traveller registrations"
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
                  <th>Pass</th>
                  <th>Traveller</th>
                  <th>Nationality</th>
                  <th>Document</th>
                  <th>Arrival</th>
                  <th>Departure</th>
                  <th>Emergency contact</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg, index) => (
                  <tr key={reg.id}>
                    <td className="is-mono">{index + 1}</td>
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
