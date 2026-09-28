import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllOrders } from "@/lib/orders-db";
import { isAdminUser } from "@/lib/admin-auth";
import DataTable, { type Column, type Row } from "./DataTable";
import { PageHeader, Panel, StatGrid, formatDay, money } from "./ui";

export const metadata: Metadata = {
  title: "Admin · Orders",
  robots: { index: false, follow: false },
};

const columns: Column[] = [
  { key: "invoice", label: "Invoice" },
  { key: "date", label: "Date" },
  { key: "product", label: "Product" },
  { key: "customer", label: "Customer" },
  { key: "pass", label: "Pass" },
  { key: "qty", label: "Qty", align: "right" },
  { key: "total", label: "Total", align: "right" },
  { key: "phone", label: "Phone" },
  { key: "receipt", label: "Receipt" },
  { key: "session", label: "Stripe session" },
  { key: "actions", label: "", sortable: false },
];

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) {
    redirect("/admin/login");
  }

  const orders = await getAllOrders();

  const revenue = orders.reduce((sum, order) => sum + order.amountTotal, 0);
  const passes = orders.reduce((sum, order) => sum + order.quantity, 0);
  const teams = orders.filter((order) => order.product.kind === "urban_sprint");
  const currency = orders[0]?.currency ?? "myr";

  // "This month" is the number an operator actually watches week to week.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thisMonth = orders.filter((order) => new Date(order.createdAt) >= monthStart);

  const rows: Row[] = orders.map((order) => ({
    id: order.sessionId,
    cells: {
      invoice: { kind: "text", value: order.invoiceNumber || "—", strong: true },
      date: { kind: "text", value: formatDay(order.createdAt) },
      // An Urban Sprint entry is an order too: the team price, with a
      // Platinum Pass for each racer. Its Booking ID links the two consoles.
      product:
        order.product.kind === "urban_sprint"
          ? { kind: "stack", primary: "Urban Sprint", secondary: order.product.reference }
          : { kind: "text", value: "Premier Pass" },
      customer: {
        kind: "stack",
        primary: order.customerName ?? "—",
        secondary: order.customerEmail ?? undefined,
      },
      // Every racer's pass is Platinum; "4 passes" would hide that.
      pass: { kind: "tier", label: order.product.kind === "urban_sprint" ? "Platinum" : order.passName },
      qty: { kind: "num", value: order.quantity, display: String(order.quantity) },
      total: {
        kind: "num",
        value: order.amountTotal,
        display: money(order.amountTotal, order.currency),
        strong: true,
      },
      phone: { kind: "text", value: order.customerPhone ?? "—" },
      // A paid order whose receipt never left is invisible otherwise: the row
      // looks complete, and only the buyer knows nothing arrived.
      receipt: order.confirmationSentAt
        ? { kind: "pill", label: "Sent", tone: "success" }
        : order.confirmationError
          ? { kind: "pill", label: "Not delivered", tone: "danger" }
          : { kind: "pill", label: "Pending", tone: "warn" },
      session: { kind: "mono", value: order.sessionId, truncate: true },
      actions: {
        kind: "actions",
        items: [
          {
            href: `/admin/orders/${order.sessionId}`,
            icon: "users",
            label: "View registrations",
          },
          {
            href: `/api/orders/${order.sessionId}/invoice?format=pdf`,
            icon: "receipt",
            label: "Download invoice",
          },
        ],
      },
    },
  }));

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Every Premier Pass purchase and Urban Sprint team entry, newest first. Each Urban Sprint racer gets a Platinum Pass."
      />

      <StatGrid
        stats={[
          { label: "Total orders", value: orders.length },
          { label: "Passes issued", value: passes },
          {
            label: "Urban Sprint teams",
            value: teams.length,
            note: money(
              teams.reduce((sum, order) => sum + order.amountTotal, 0),
              currency
            ),
          },
          { label: "Revenue", value: money(revenue, currency) },
          {
            label: "This month",
            value: thisMonth.length,
            note: money(
              thisMonth.reduce((sum, order) => sum + order.amountTotal, 0),
              currency
            ),
          },
        ]}
      />

      <Panel padded={false}>
        <DataTable
          columns={columns}
          rows={rows}
          noun="order"
          searchPlaceholder="Search invoice, Booking ID, customer, email…"
          emptyIcon="receipt"
          emptyTitle="No orders yet"
          emptyBody="Completed checkouts will appear here as soon as Stripe confirms the first payment."
        />
      </Panel>
    </>
  );
}
