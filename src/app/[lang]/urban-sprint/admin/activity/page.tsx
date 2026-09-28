import { getActivityCounts, listActivity } from "@/lib/urban-sprint/completions-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { dayTime, percent, points, timeAgo } from "@/lib/urban-sprint/format";
import LiveRefresh from "../../_components/LiveRefresh";
import { voidCompletionAction } from "../actions";
import ConfirmButton from "../ConfirmButton";
import Dialog from "../Dialog";
import { AdminFlash, EmptyState, LiveBadge, PageHeader, Panel, Pill, StatGrid, Swatch } from "../ui";

/**
 * The score ledger, newest first.
 *
 * Every award is here with the arithmetic that produced it, which makes an
 * argument about a score answerable rather than a matter of opinion. Voiding
 * is the correction mechanism: the row stays, marked, with a reason, and the
 * team's total is recomputed from what remains valid.
 */
export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const [feed, counts, settings] = await Promise.all([
    listActivity(200),
    getActivityCounts(),
    getSettings(),
  ]);

  const boosted = feed.filter((row) => row.status === "valid" && row.boosterApplied).length;

  return (
    <>
      <LiveRefresh revision={settings.revision} intervalMs={5000} />

      <PageHeader
        title="Activity"
        subtitle="Every station a gamemaster confirmed, with the arithmetic behind it. Nothing here is ever deleted."
      />

      <AdminFlash params={params} />

      <StatGrid
        stats={[
          { label: "Valid completions", value: counts.valid },
          { label: "Voided", value: counts.voided },
          { label: "Boosted", value: boosted, note: "in the latest 200" },
        ]}
      />

      <Panel title="Score history" icon="clock" count={String(feed.length)} padded={false} actions={<LiveBadge />}>
        {feed.length === 0 ? (
          <EmptyState icon="clock" title="Nothing confirmed yet">
            Completions appear here the moment a gamemaster confirms a station.
          </EmptyState>
        ) : (
          <div className="ad-table-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Team</th>
                  <th>Station</th>
                  <th>Confirmed by</th>
                  <th className="is-num">Base</th>
                  <th>Booster</th>
                  <th className="is-num">Total</th>
                  <th>Status</th>
                  <th className="is-num" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {feed.map((row) => (
                  <tr key={row.id} className={row.status === "void" ? "is-void" : undefined}>
                    <td>
                      <span className="ad-cell-stack">
                        <b>{timeAgo(row.createdAt)}</b>
                        <span>{dayTime(row.createdAt)}</span>
                      </span>
                    </td>
                    <td>
                      <span className="usc-name">
                        <Swatch color={row.teamColor} />
                        {row.teamName}
                      </span>
                    </td>
                    <td>
                      <span className="ad-cell-stack">
                        <b>{row.stationName}</b>
                        <span>{row.categoryName}</span>
                      </span>
                    </td>
                    <td>{row.gamemasterName}</td>
                    <td className="is-num">{points(row.basePoints)}</td>
                    <td>
                      {row.boosterApplied ? (
                        <span className="ad-cell-stack">
                          <b className="usc-points is-boost">+{points(row.bonusPoints)}</b>
                          <span>
                            {row.boosterName} +{percent(row.bonusPercent)}
                          </span>
                        </span>
                      ) : (
                        <span className="usc-muted">—</span>
                      )}
                    </td>
                    <td className="is-num">
                      <span className="usc-points">{points(row.totalPoints)}</span>
                    </td>
                    <td>
                      {row.status === "valid" ? (
                        <Pill label="Valid" tone="success" />
                      ) : (
                        <span className="ad-cell-stack">
                          <Pill label="Void" tone="danger" />
                          {row.voidReason && <span>{row.voidReason}</span>}
                        </span>
                      )}
                    </td>
                    <td className="is-actions">
                      {row.status === "valid" && (
                        <Dialog
                          label="Void"
                          variant="small"
                          title={`Void ${row.teamName} → ${row.stationName}`}
                          description={`Removes ${points(row.totalPoints)} points from ${row.teamName}. The record stays, and the station becomes completable again.`}
                        >
                          <form className="usc-form" action={voidCompletionAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <label className="admin-field">
                              <span>Reason</span>
                              <input name="reason" placeholder="Confirmed at the wrong station" required />
                            </label>
                            <div className="usc-form-foot">
                              <ConfirmButton
                                className="ad-btn ad-btn-danger"
                                message={`Void this completion and remove ${points(row.totalPoints)} points from ${row.teamName}?`}
                              >
                                Void completion
                              </ConfirmButton>
                            </div>
                          </form>
                        </Dialog>
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
