import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-auth";
import { getAllPasses, getPassByNumber } from "@/lib/pass-registrations-db";
import { PASS_NUMBER_LENGTH, formatPassNumber, normalizePassNumber } from "@/lib/pass-number";
import { addDays, parseDate, todayInMalaysia } from "@/app/data/experiences";
import { Icon } from "@/app/components/Icons";
import DataTable, { type Column, type Row } from "../DataTable";
import { Flash, PageHeader, Panel, StatGrid, formatDay } from "../ui";

export const metadata: Metadata = {
  title: "Admin · Passes",
  robots: { index: false, follow: false },
};

type PassesPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const columns: Column[] = [
  { key: "number", label: "Pass No." },
  { key: "traveller", label: "Traveller" },
  { key: "pass", label: "Pass" },
  { key: "account", label: "Account" },
  { key: "invoice", label: "Invoice" },
  { key: "arrival", label: "Arrival", align: "right" },
  { key: "status", label: "Status" },
  { key: "actions", label: "", sortable: false },
];

export default async function AdminPassesPage({ searchParams }: PassesPageProps) {
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) {
    redirect("/admin/login");
  }

  // The counter workflow: type the number the traveller gives you and land
  // straight on that pass. Anything that isn't an exact number falls through
  // to the table below, whose search covers names, passports and emails.
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const wanted = normalizePassNumber(query);
  if (wanted.length === PASS_NUMBER_LENGTH && (await getPassByNumber(wanted))) {
    redirect(`/admin/passes/${wanted}`);
  }

  const passes = await getAllPasses();

  const today = todayInMalaysia();
  const weekAhead = addDays(today, 7);
  const awaiting = passes.filter((pass) => !pass.collectedAt);
  const arrivingSoon = awaiting.filter(
    (pass) => pass.arrivalDate >= today && pass.arrivalDate <= weekAhead
  );

  const rows: Row[] = passes.map((pass) => {
    const order = pass.order;
    const accountId = order?.userId ?? pass.userId;
    const number = pass.passNumber ?? "";

    return {
      id: String(pass.id),
      // Staff type numbers without the hyphens as often as with them.
      searchText: number,
      cells: {
        number: { kind: "mono", value: number ? formatPassNumber(number) : "—" },
        traveller: {
          kind: "stack",
          primary: pass.fullName,
          secondary: `${pass.travelDocumentType} ${pass.travelDocumentNumber}`,
        },
        pass: { kind: "tier", label: pass.passName },
        account: {
          kind: "stack",
          primary: order?.customerName ?? "—",
          secondary: order?.customerEmail ?? undefined,
        },
        invoice: { kind: "text", value: order?.invoiceNumber || "—", strong: true },
        arrival: {
          kind: "num",
          value: parseDate(pass.arrivalDate).getTime(),
          display: formatDay(pass.arrivalDate),
        },
        status: pass.collectedAt
          ? { kind: "pill", label: "Collected", tone: "success" }
          : { kind: "pill", label: "Awaiting collection", tone: "warn" },
        actions: {
          kind: "actions",
          items: [
            ...(number
              ? [{ href: `/admin/passes/${number}`, icon: "ticket", label: "Open pass" }]
              : []),
            {
              href: `/admin/orders/${pass.orderSessionId}`,
              icon: "receipt",
              label: "View order",
            },
            ...(accountId
              ? [{ href: `/admin/users/${accountId}`, icon: "user", label: "View customer" }]
              : []),
          ],
        },
      },
    };
  });

  return (
    <>
      <PageHeader
        title="Passes"
        subtitle="Every pass issued, who it belongs to, and whether it has been collected at the airport."
      />

      <Panel title="Hand over a pass" icon="ticket">
        <p className="ad-panel-note">
          Type the pass number the traveller gives you, then check their passport against the
          details on the next screen.
        </p>
        <form className="ad-lookup" method="get" action="/admin/passes">
          <label className="ad-search ad-lookup-input">
            <Icon name="search" />
            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder="e.g. 7KQM-4XRT-2BHN-9CWD"
              aria-label="Pass number"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
              required
            />
          </label>
          <button className="ad-btn ad-btn-primary" type="submit">
            Find pass
          </button>
        </form>
        {query && (
          <div className="ad-lookup-miss">
            <Flash tone="err">
              No pass has the number “{query}”. Check it with the traveller, or search the table
              below by their name or passport number.
            </Flash>
          </div>
        )}
      </Panel>

      <StatGrid
        stats={[
          { label: "Passes issued", value: passes.length },
          { label: "Awaiting collection", value: awaiting.length },
          { label: "Collected", value: passes.length - awaiting.length },
          {
            label: "Arriving this week",
            value: arrivingSoon.length,
            note: "Not yet collected",
          },
        ]}
      />

      <Panel padded={false}>
        <DataTable
          columns={columns}
          rows={rows}
          noun="pass"
          nounPlural="passes"
          searchPlaceholder="Search pass no., traveller, passport, email, invoice…"
          emptyIcon="ticket"
          emptyTitle="No passes yet"
          emptyBody="Each traveller's pass appears here, with its number, as soon as their order is paid."
        />
      </Panel>
    </>
  );
}
