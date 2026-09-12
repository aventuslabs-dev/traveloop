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
  { key: "customer", label: "Customer" },
  { key: "pass", label: "Pass" },
  { key: "qty", label: "Qty", align: "right" },
  { key: "total", label: "Total", align: "right" },
  { key: "phone", label: "Phone" },
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
      customer: {
        kind: "stack",
        primary: order.customerName ?? "—",
        secondary: order.customerEmail ?? undefined,
      },
      pass: { kind: "tier", label: order.passName },
      qty: { kind: "num", value: order.quantity, display: String(order.quantity) },
      total: {
        kind: "num",
        value: order.amountTotal,
        display: money(order.amountTotal, order.currency),
        strong: true,
      },
      phone: { kind: "text", value: order.customerPhone ?? "—" },
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
        subtitle="Every pass purchased through checkout, newest first."
      />

      <StatGrid
        stats={[
          { label: "Total orders", value: orders.length },
          { label: "Passes sold", value: passes },
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
          searchPlaceholder="Search invoice, customer, email…"
          emptyIcon="receipt"
          emptyTitle="No orders yet"
          emptyBody="Completed checkouts will appear here as soon as Stripe confirms the first payment."
        />
      </Panel>
    </>
  );
}
