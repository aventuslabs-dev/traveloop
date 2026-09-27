import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-auth";
import { discountStatus, getDiscount, type StoredDiscount } from "@/lib/discounts-db";
import { describeDiscount } from "@/lib/pricing";
import { todayInMalaysia } from "@/app/data/experiences";
import { Flash, PageHeader, Panel, Pill } from "../../ui";
import DiscountForm from "../DiscountForm";
import { removeDiscount, type DiscountFormValues } from "../discount-actions";
import { STATUS_PILLS } from "../status";

export const metadata: Metadata = {
  title: "Admin · Discount",
  robots: { index: false, follow: false },
};

type DiscountPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const ERRORS: Record<string, string> = {
  used: "This discount has been used, so it can't be deleted — switch it off instead.",
  delete: "Couldn't delete that discount. Please try again.",
};

/** The stored discount as the form's fields; dates as the Malaysian day they fall on. */
function toFormValues(discount: StoredDiscount): DiscountFormValues {
  const day = (value: string | null) => (value ? todayInMalaysia(new Date(value)) : "");
  return {
    automatic: discount.automatic ? "on" : "",
    code: discount.code ?? "",
    label: discount.label,
    kind: discount.kind,
    // Amounts are stored in sen; the form takes MYR.
    value: discount.kind === "amount" ? (discount.value / 100).toFixed(2) : String(discount.value),
    startsOn: day(discount.startsAt),
    endsOn: day(discount.endsAt),
    maxRedemptions: discount.maxRedemptions === null ? "" : String(discount.maxRedemptions),
    active: discount.active ? "on" : "",
  };
}

export default async function AdminDiscountPage({ params, searchParams }: DiscountPageProps) {
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) {
    redirect("/admin/login");
  }

  const id = Number((await params).id);
  const discount = Number.isInteger(id) ? await getDiscount(id) : null;
  if (!discount) {
    notFound();
  }

  const query = await searchParams;
  const error = typeof query.error === "string" ? ERRORS[query.error] : null;
  const status = STATUS_PILLS[discountStatus(discount)];

  return (
    <>
      <PageHeader
        backHref="/admin/discounts"
        backLabel="All discounts"
        title={discount.code ?? discount.label}
        subtitle={`${describeDiscount(discount)} · ${
          discount.automatic ? "every pass, automatically" : "whole order"
        }`}
        actions={<Pill label={status.label} tone={status.tone} />}
      />

      {query.saved === "1" && <Flash tone="ok">Discount saved.</Flash>}
      {error && <Flash tone="err">{error}</Flash>}

      {!discount.automatic && (
        <p className="ad-head-sub ad-usage">
          Used on <strong>{discount.redemptions}</strong> paid order
          {discount.redemptions === 1 ? "" : "s"}
          {discount.maxRedemptions !== null ? ` of ${discount.maxRedemptions} allowed` : ""}.
        </p>
      )}

      <Panel title="Edit discount" icon="pencil">
        {discount.automatic && (
          <p className="ad-panel-note">
            Changes show on the home and passes pages straight away, and apply to every checkout
            from now on. Orders already paid keep the discount they were charged with.
          </p>
        )}
        <DiscountForm id={discount.id} initial={toFormValues(discount)} submitLabel="Save changes" />
      </Panel>

      {discount.redemptions === 0 && (
        <form action={removeDiscount}>
          <input type="hidden" name="id" value={discount.id} />
          <Panel
            title="Delete this discount"
            icon="alert"
            tone="danger"
            footer={
              <button className="ad-btn ad-btn-danger" type="submit">
                Delete discount
              </button>
            }
          >
            <p className="ad-panel-note">
              {discount.automatic
                ? "Prices go back to list price once no automatic discount is on. To pause it instead, untick “Switched on” above."
                : "It hasn't been used yet, so nothing else is affected. To pause it instead, untick “Switched on” above."}
            </p>
          </Panel>
        </form>
      )}
    </>
  );
}
