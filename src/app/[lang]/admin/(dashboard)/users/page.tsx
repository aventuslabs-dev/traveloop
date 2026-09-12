import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-auth";
import { listCustomerAccounts } from "@/lib/customer-accounts-db";
import DataTable, { type Column, type Row } from "../DataTable";
import { Flash, PageHeader, Panel, StatGrid, formatDay, formatDayTime } from "../ui";
import NewCustomerForm from "./NewCustomerForm";

export const metadata: Metadata = {
  title: "Admin · Customers",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const columns: Column[] = [
  { key: "email", label: "Email" },
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "orders", label: "Orders", align: "right" },
  { key: "bookings", label: "Bookings", align: "right" },
  { key: "created", label: "Joined" },
  { key: "seen", label: "Last sign-in" },
  { key: "actions", label: "", sortable: false },
];

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const deleted = typeof params.deleted === "string" ? params.deleted : null;
  const missing = params.error === "missing";

  const customers = await listCustomerAccounts();
  const withOrders = customers.filter((c) => c.orderCount > 0).length;
  const neverSignedIn = customers.filter((c) => !c.lastSignInAt).length;

  const rows: Row[] = customers.map((customer) => ({
    id: customer.userId,
    cells: {
      email: { kind: "text", value: customer.email, strong: true },
      name: { kind: "text", value: customer.fullName ?? "—" },
      nationality: { kind: "text", value: customer.nationality ?? "—" },
      orders: {
        kind: "num",
        value: customer.orderCount,
        display: String(customer.orderCount),
      },
      bookings: {
        kind: "num",
        value: customer.bookingCount,
        display: String(customer.bookingCount),
      },
      created: { kind: "text", value: formatDay(customer.createdAt) },
      seen: {
        kind: "text",
        value: customer.lastSignInAt ? formatDayTime(customer.lastSignInAt) : "Never",
      },
      actions: {
        kind: "actions",
        items: [
          {
            href: `/admin/users/${customer.userId}`,
            icon: "pencil",
            label: `Manage ${customer.email}`,
          },
        ],
      },
    },
  }));

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Accounts created at checkout, plus any you add by hand."
        actions={<NewCustomerForm />}
      />

      {deleted && <Flash tone="ok">Deleted the account for {deleted}.</Flash>}
      {missing && <Flash tone="err">That account no longer exists.</Flash>}

      <StatGrid
        stats={[
          { label: "Accounts", value: customers.length },
          { label: "With orders", value: withOrders },
          {
            label: "Never signed in",
            value: neverSignedIn,
            note: neverSignedIn > 0 ? "May not have found their password" : undefined,
          },
        ]}
      />

      <Panel padded={false}>
        <DataTable
          columns={columns}
          rows={rows}
          noun="customer"
          searchPlaceholder="Search email, name, nationality…"
          emptyIcon="users"
          emptyTitle="No customer accounts yet"
          emptyBody="Accounts are created automatically when someone completes checkout, or you can add one manually."
        />
      </Panel>
    </>
  );
}
