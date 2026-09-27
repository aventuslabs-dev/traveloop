import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-auth";
import { getPassByNumber } from "@/lib/pass-registrations-db";
import { formatPassNumber, normalizePassNumber } from "@/lib/pass-number";
import { Flash, PageHeader, Panel, Pill, Tier, formatDay, formatDayTime } from "../../ui";
import { setCollected } from "../pass-actions";

export const metadata: Metadata = {
  title: "Admin · Pass",
  robots: { index: false, follow: false },
};

type PassDetailPageProps = {
  params: Promise<{ passNumber: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * The counter screen. Everything the person handing over the pass needs to
 * check sits at the top, largest first — name and passport number, to hold
 * against the passport in front of them — then one button.
 */
export default async function AdminPassDetailPage({ params, searchParams }: PassDetailPageProps) {
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) {
    redirect("/admin/login");
  }

  const { passNumber: raw } = await params;
  const passNumber = normalizePassNumber(decodeURIComponent(raw));
  const pass = await getPassByNumber(passNumber);
  if (!pass) {
    notFound();
  }

  const query = await searchParams;
  const order = pass.order;
  const accountId = order?.userId ?? pass.userId;

  return (
    <>
      <PageHeader
        backHref="/admin/passes"
        backLabel="All passes"
        title={formatPassNumber(passNumber)}
        subtitle={`${pass.passName} Pass · ${pass.fullName}`}
      />

      {query.collected === "1" && (
        <Flash tone="ok">Marked as collected. {pass.fullName} has their pass.</Flash>
      )}
      {query.undone === "1" && <Flash tone="ok">Collection undone — the pass is back to awaiting.</Flash>}
      {query.error === "save" && (
        <Flash tone="err">That didn&apos;t save. Please try again.</Flash>
      )}

      <Panel
        title={pass.collectedAt ? "Collected" : "Check before handing over"}
        icon={pass.collectedAt ? "check" : "shield"}
        tone={pass.collectedAt ? "success" : undefined}
        footer={
          <form action={setCollected}>
            <input type="hidden" name="passNumber" value={passNumber} />
            {pass.collectedAt ? (
              <>
                <input type="hidden" name="collected" value="0" />
                <button className="ad-btn" type="submit">
                  Undo — not collected
                </button>
              </>
            ) : (
              <>
                <input type="hidden" name="collected" value="1" />
                <button className="ad-btn ad-btn-primary ad-btn-lg" type="submit">
                  Passport checked — mark as collected
                </button>
              </>
            )}
          </form>
        }
      >
        {pass.collectedAt ? (
          <p className="ad-panel-note">
            Handed over <strong>{formatDayTime(pass.collectedAt)}</strong>. If this was recorded by
            mistake, undo it below.
          </p>
        ) : (
          <p className="ad-panel-note">
            The name and document number on the passport must match these exactly.
          </p>
        )}

        <dl className="ad-verify">
          <div>
            <dt>Traveller</dt>
            <dd>{pass.fullName}</dd>
          </div>
          <div>
            <dt>{pass.travelDocumentType} number</dt>
            <dd className="is-mono">{pass.travelDocumentNumber}</dd>
          </div>
          <div>
            <dt>Nationality</dt>
            <dd>{pass.nationality}</dd>
          </div>
          <div>
            <dt>Pass</dt>
            <dd>
              <Tier name={pass.passName} />
            </dd>
          </div>
        </dl>
      </Panel>

      <Panel title="Belongs to" icon="user">
        <dl className="ad-dl">
          <div>
            <dt>Account</dt>
            <dd>
              {accountId ? (
                <Link className="ad-link" href={`/admin/users/${accountId}`}>
                  {order?.customerEmail ?? "View customer"}
                </Link>
              ) : (
                <span className="ad-cell-stack">
                  <span>{order?.customerEmail ?? "—"}</span>
                  <span>No account linked</span>
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt>Bought by</dt>
            <dd>{order?.customerName ?? "—"}</dd>
          </div>
          <div>
            <dt>Invoice</dt>
            <dd>
              <Link className="ad-link" href={`/admin/orders/${pass.orderSessionId}`}>
                {order?.invoiceNumber || "View order"}
              </Link>
            </dd>
          </div>
          <div>
            <dt>Purchased</dt>
            <dd>{formatDay(order?.createdAt ?? pass.createdAt)}</dd>
          </div>
          <div>
            <dt>Trip dates</dt>
            <dd>
              {formatDay(pass.arrivalDate)} – {formatDay(pass.departureDate)}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              {pass.collectedAt ? (
                <Pill label="Collected" tone="success" />
              ) : (
                <Pill label="Awaiting collection" tone="warn" />
              )}
            </dd>
          </div>
        </dl>
      </Panel>
    </>
  );
}
