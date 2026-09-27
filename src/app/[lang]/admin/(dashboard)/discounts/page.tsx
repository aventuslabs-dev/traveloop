import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-auth";
import { discountStatus, listDiscounts, type StoredDiscount } from "@/lib/discounts-db";
import { getAllOrders } from "@/lib/orders-db";
import { describeDiscount } from "@/lib/pricing";
import DataTable, { type Column, type Row } from "../DataTable";
import { Flash, PageHeader, Panel, StatGrid, formatDay, money } from "../ui";
import DiscountForm from "./DiscountForm";
import { EMPTY_DISCOUNT, STATUS_PILLS } from "./status";

export const metadata: Metadata = {
  title: "Admin · Discounts",
  robots: { index: false, follow: false },
};

type DiscountsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const columns: Column[] = [
  { key: "code", label: "Code" },
  { key: "label", label: "Label" },
  { key: "discount", label: "Discount" },
  { key: "applies", label: "Applies to" },
  { key: "dates", label: "Dates" },
  { key: "uses", label: "Uses", align: "right" },
  { key: "status", label: "Status" },
  { key: "actions", label: "", sortable: false },
];

function dateRange(discount: StoredDiscount): string {
  if (!discount.startsAt && !discount.endsAt) return "Always";
  if (!discount.endsAt) return `From ${formatDay(discount.startsAt)}`;
  if (!discount.startsAt) return `Until ${formatDay(discount.endsAt)}`;
  return `${formatDay(discount.startsAt)} – ${formatDay(discount.endsAt)}`;
}

export default async function AdminDiscountsPage({ searchParams }: DiscountsPageProps) {
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) {
    redirect("/admin/login");
  }

  const [discounts, orders] = await Promise.all([listDiscounts(), getAllOrders()]);
  const deleted = (await searchParams).deleted === "1";

  const currency = orders[0]?.currency ?? "myr";
  const codeSavings = orders.reduce((sum, order) => sum + order.discount.codeCents, 0);
  const automaticSavings = orders.reduce((sum, order) => sum + order.discount.automaticCents, 0);
  const codeOrders = orders.filter((order) => order.discount.codeCents > 0).length;
  const liveCodes = discounts.filter((d) => !d.automatic && discountStatus(d) === "live").length;

  const rows: Row[] = discounts.map((discount) => {
    const status = STATUS_PILLS[discountStatus(discount)];
    return {
      id: String(discount.id),
      cells: {
        code: discount.automatic
          ? { kind: "pill", label: "Automatic", tone: "info" }
          : { kind: "mono", value: discount.code ?? "" },
        label: { kind: "text", value: discount.label, strong: true },
        discount: { kind: "text", value: describeDiscount(discount) },
        applies: {
          kind: "text",
          value: discount.automatic ? "Every pass, no code" : "Whole order",
        },
        dates: { kind: "text", value: dateRange(discount) },
        uses: discount.automatic
          ? { kind: "num", value: -1, display: "—" }
          : {
              kind: "num",
              value: discount.redemptions,
              display:
                discount.maxRedemptions === null
                  ? String(discount.redemptions)
                  : `${discount.redemptions} / ${discount.maxRedemptions}`,
            },
        status: { kind: "pill", label: status.label, tone: status.tone },
        actions: {
          kind: "actions",
          items: [{ href: `/admin/discounts/${discount.id}`, icon: "pencil", label: "Edit" }],
        },
      },
    };
  });

  return (
    <>
      <PageHeader
        title="Discounts"
        subtitle="The automatic launch discount, and codes buyers enter in the cart."
      />

      {deleted && <Flash tone="ok">Discount deleted.</Flash>}

      <StatGrid
        stats={[
          { label: "Live codes", value: liveCodes },
          { label: "Orders with a code", value: codeOrders },
          { label: "Saved with codes", value: money(codeSavings, currency) },
          { label: "Saved automatically", value: money(automaticSavings, currency) },
        ]}
      />

      <Panel padded={false}>
        <DataTable
          columns={columns}
          rows={rows}
          noun="discount"
          searchPlaceholder="Search code or label…"
          emptyIcon="tag"
          emptyTitle="No discounts yet"
          emptyBody="Create a code below. Run supabase/schema.sql if the launch discount is missing."
        />
      </Panel>

      <Panel title="New discount" icon="tag">
        <p className="ad-panel-note">
          Codes stack on top of the automatic discount: a percentage comes off the order after the
          launch price, a fixed amount comes off once per order. A code covering the whole
          order (100%) makes it free; anything short of that stops at MYR 2.00, Stripe&apos;s
          minimum charge.
        </p>
        <DiscountForm initial={EMPTY_DISCOUNT} submitLabel="Create discount" />
      </Panel>
    </>
  );
}
