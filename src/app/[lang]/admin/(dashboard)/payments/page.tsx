import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  RECENT_WINDOW_DAYS,
  getAllPaymentAttempts,
  type StoredPaymentAttempt,
} from "@/lib/payment-attempts-db";
import { isAdminUser } from "@/lib/admin-auth";
import { stripeDashboardUrl } from "@/lib/stripe";
import DataTable, { type Column, type Row } from "../DataTable";
import { PageHeader, Panel, StatGrid, formatDayTime, money, type PillTone } from "../ui";

export const metadata: Metadata = {
  title: "Admin · Failed payments",
  robots: { index: false, follow: false },
};

const columns: Column[] = [
  { key: "when", label: "When" },
  { key: "status", label: "Status" },
  { key: "customer", label: "Customer" },
  { key: "pass", label: "Cart" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "reason", label: "Reason" },
  { key: "phone", label: "Phone" },
  { key: "ref", label: "Stripe ref" },
  { key: "actions", label: "", sortable: false },
];

const STATUS_LABELS: Record<StoredPaymentAttempt["status"], string> = {
  failed: "Declined",
  expired: "Abandoned",
};

const STATUS_TONES: Record<StoredPaymentAttempt["status"], PillTone> = {
  failed: "danger",
  expired: "warn",
};

/**
 * Stripe's decline codes are snake_case and go straight in front of the
 * operator, so "insufficient_funds" becomes "Insufficient funds".
 */
function humanizeCode(code: string): string {
  const spaced = code.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function reasonFor(attempt: StoredPaymentAttempt): string {
  if (attempt.status === "expired") return "Left checkout without paying";
  if (attempt.failureCode) return humanizeCode(attempt.failureCode);
  return attempt.failureMessage ?? "Declined, no reason given";
}

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) {
    redirect("/admin/login");
  }

  const attempts = await getAllPaymentAttempts();

  // Same window as the nav badge, so the rail and this page never disagree.
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - RECENT_WINDOW_DAYS);
  const recent = attempts.filter((a) => new Date(a.occurredAt) >= weekAgo);
  const declined = attempts.filter((a) => a.status === "failed");
  const currency = attempts.find((a) => a.currency)?.currency ?? "myr";

  // What the declines were worth, so a run of failures can be weighed against
  // the effort of chasing them. Abandoned carts are excluded: nobody tried to
  // pay, so there is no sale to have lost.
  const valueAtRisk = declined.reduce((sum, a) => sum + (a.amountTotal ?? 0), 0);

  // Named decline reasons only — an unexplained decline tells an operator
  // nothing, and would otherwise win this count by sheer volume.
  const topReason = mostCommon(declined.filter((a) => a.failureCode).map((a) => a.failureCode!));

  const rows: Row[] = attempts.map((attempt) => ({
    id: attempt.eventId,
    cells: {
      when: { kind: "text", value: formatDayTime(attempt.occurredAt) },
      status: {
        kind: "pill",
        label: STATUS_LABELS[attempt.status],
        tone: STATUS_TONES[attempt.status],
      },
      customer: {
        kind: "stack",
        primary: attempt.customerName ?? "—",
        secondary: attempt.customerEmail ?? undefined,
      },
      pass: { kind: "text", value: attempt.passSummary ?? "—" },
      amount: {
        kind: "num",
        value: attempt.amountTotal ?? 0,
        display:
          attempt.amountTotal === null
            ? "—"
            : money(attempt.amountTotal, attempt.currency ?? currency),
      },
      reason: { kind: "text", value: reasonFor(attempt) },
      phone: { kind: "text", value: attempt.customerPhone ?? "—" },
      ref: {
        kind: "mono",
        value: attempt.paymentIntentId ?? attempt.sessionId ?? "—",
        truncate: true,
      },
      actions: {
        kind: "actions",
        items: attempt.paymentIntentId
          ? [
              {
                href: stripeDashboardUrl(`payments/${attempt.paymentIntentId}`),
                icon: "eye",
                label: "Open in Stripe",
                external: true,
              },
            ]
          : [],
      },
    },
  }));

  return (
    <>
      <PageHeader
        title="Failed payments"
        subtitle="Checkouts that never became orders — declined cards, unsettled FPX payments, and abandoned carts."
      />

      <StatGrid
        stats={[
          {
            label: "Declined payments",
            value: declined.length,
            note: declined.length > 0 ? `${money(valueAtRisk, currency)} not collected` : "None yet",
          },
          {
            label: "Last 7 days",
            value: recent.length,
            alert: recent.some((a) => a.status === "failed"),
            note: `${recent.filter((a) => a.status === "failed").length} declined`,
          },
          {
            label: "Abandoned carts",
            value: attempts.filter((a) => a.status === "expired").length,
            note: "Reported ~24h after the buyer leaves",
          },
          {
            label: "Most common reason",
            value: topReason ? humanizeCode(topReason) : "—",
          },
        ]}
      />

      <Panel padded={false}>
        <DataTable
          columns={columns}
          rows={rows}
          noun="attempt"
          searchPlaceholder="Search customer, email, reason…"
          emptyIcon="alert"
          emptyTitle="No failed payments"
          emptyBody="Declined cards and abandoned checkouts will appear here. Nothing yet means every checkout that was started went through."
        />
      </Panel>
    </>
  );
}

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }

  return best;
}
