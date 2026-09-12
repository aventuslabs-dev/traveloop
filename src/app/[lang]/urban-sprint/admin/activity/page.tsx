import { getActivityCounts, listActivity } from "@/lib/urban-sprint/completions-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { dayTime, percent, points, timeAgo } from "@/lib/urban-sprint/format";
import LiveRefresh from "../../_components/LiveRefresh";
import { LivePill } from "../../_components/ui";
import { voidCompletionAction } from "../actions";
import { AdminFlash, AdminHead, Panel, RowEditor } from "../ui";

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

  return (
    <>
      <LiveRefresh revision={settings.revision} intervalMs={5000} />

      <AdminHead
        title="Activity"
        note={`${counts.valid} valid completion${counts.valid === 1 ? "" : "s"}${
          counts.voided > 0 ? `, ${counts.voided} voided` : ""
        }. Nothing here is ever deleted.`}
      />

      <AdminFlash params={params} />

      <Panel title="Score history" count={feed.length} actions={<LivePill />} flush>
        {feed.length === 0 ? (
          <p className="us-panel-empty">No stations have been confirmed yet.</p>
        ) : (
          <div className="us-tablewrap">
            <table className="us-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Team</th>
                  <th>Station</th>
                  <th>Confirmed by</th>
                  <th>Base</th>
                  <th>Booster</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {feed.map((row) => (
                  <tr key={row.id} className={row.status === "void" ? "is-voidrow" : undefined}>
                    <td>
                      <span className="us-tablename">{timeAgo(row.createdAt)}</span>
                      <span className="us-tablesub">{dayTime(row.createdAt)}</span>
                    </td>

                    <td>
                      <span className="us-teamdot" style={{ background: row.teamColor }} aria-hidden />
                      {row.teamName}
                    </td>

                    <td>
                      <span className="us-tablename">{row.stationName}</span>
                      <span className="us-tablesub">{row.categoryName}</span>
                    </td>

                    <td>{row.gamemasterName}</td>
                    <td>{points(row.basePoints)}</td>

                    <td>
                      {row.boosterApplied ? (
                        <>
                          <span className="us-tablename">+{points(row.bonusPoints)}</span>
                          <span className="us-tablesub">
                            {row.boosterName} +{percent(row.bonusPercent)}
                          </span>
                        </>
                      ) : (
                        <span className="us-dim">—</span>
                      )}
                    </td>

                    <td className="us-strong">{points(row.totalPoints)}</td>

                    <td>
                      <span className={`us-pill us-pill-${row.status === "valid" ? "ok" : "danger"}`}>
                        {row.status === "valid" ? "Valid" : "Void"}
                      </span>
                      {row.voidReason && <span className="us-tablesub">{row.voidReason}</span>}
                    </td>

                    <td className="us-table-actions">
                      {row.status === "valid" ? (
                        <RowEditor label="Void">
                          <form className="us-form" action={voidCompletionAction}>
                            <input type="hidden" name="id" value={row.id} />

                            <label className="us-field">
                              <span>Reason</span>
                              <input
                                name="reason"
                                placeholder="Confirmed at the wrong station"
                                required
                              />
                              <small>
                                Removes {points(row.totalPoints)} from {row.teamName}. The record
                                stays, and the station becomes completable again.
                              </small>
                            </label>

                            <button className="us-btn us-btn-danger us-btn-sm" type="submit">
                              Void this completion
                            </button>
                          </form>
                        </RowEditor>
                      ) : (
                        <span className="us-dim">Voided</span>
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
