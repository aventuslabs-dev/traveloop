import Link from "next/link";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { getCampaignStats } from "@/lib/urban-sprint/stats-db";
import { countUsersByRole } from "@/lib/urban-sprint/users-db";
import { getActivityCounts, listActivity } from "@/lib/urban-sprint/completions-db";
import { getLeaderboard } from "@/lib/urban-sprint/leaderboard-db";
import { EVENT_STATUSES } from "@/lib/urban-sprint/types";
import { points, timeAgo } from "@/lib/urban-sprint/format";
import Leaderboard from "../_components/Leaderboard";
import LiveRefresh from "../_components/LiveRefresh";
import { LivePill } from "../_components/ui";
import { updateSettingsAction } from "./actions";
import { AdminFlash, AdminHead, Panel } from "./ui";

const STATUS_LABEL: Record<string, string> = {
  upcoming: "Upcoming — teams still forming",
  live: "Live — race in progress",
  paused: "Paused — play on hold",
  ended: "Ended — final standings",
};

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const [settings, stats, roles, activity, feed, board] = await Promise.all([
    getSettings(),
    getCampaignStats(),
    countUsersByRole(),
    getActivityCounts(),
    listActivity(6),
    getLeaderboard(5),
  ]);

  return (
    <>
      <LiveRefresh revision={settings.revision} intervalMs={5000} />

      <AdminHead
        title="Overview"
        note="The campaign at a glance, and the settings that shape how it scores."
      />

      <AdminFlash params={params} />

      <div className="us-adminstats">
        <Stat label="Teams" value={stats.teams} note={`${stats.gamemastersOnCourse} on course`} />
        <Stat label="Stations" value={stats.stations} note="active" />
        <Stat
          label="Stations cleared"
          value={activity.valid}
          note={activity.voided > 0 ? `${activity.voided} voided` : "none voided"}
        />
        <Stat label="Points awarded" value={points(stats.pointsAwarded)} note="across all teams" />
        <Stat
          label="People"
          value={roles.admin + roles.gamemaster + roles.participant}
          note={`${roles.gamemaster} GM · ${roles.participant} players`}
        />
      </div>

      <div className="us-admingrid">
        <Panel
          title="Campaign settings"
          note="What the public page says, and the default a new station is priced at."
        >
          <form className="us-form us-form-grid" action={updateSettingsAction}>
            <label className="us-field">
              <span>Event name</span>
              <input name="eventName" defaultValue={settings.eventName} required />
            </label>

            <label className="us-field">
              <span>Location</span>
              <input name="eventLocation" defaultValue={settings.eventLocation} />
            </label>

            <label className="us-field us-field-wide">
              <span>Tagline</span>
              <input name="eventTagline" defaultValue={settings.eventTagline} />
            </label>

            <label className="us-field">
              <span>Status</span>
              <select name="eventStatus" defaultValue={settings.eventStatus}>
                {EVENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </label>

            <label className="us-field">
              <span>Default base points</span>
              <input
                name="defaultBasePoints"
                type="number"
                min="0"
                step="0.5"
                defaultValue={settings.defaultBasePoints}
              />
              <small>New stations start here. Existing stations keep their own value.</small>
            </label>

            <div className="us-form-actions us-field-wide">
              <button className="us-btn us-btn-primary" type="submit">
                Save settings
              </button>
            </div>
          </form>
        </Panel>

        <Panel
          title="Standings"
          note="Top five, live."
          actions={
            <Link className="us-btn us-btn-ghost us-btn-sm" href="/urban-sprint/admin/leaderboard">
              Full board
            </Link>
          }
        >
          <Leaderboard rows={board} />
        </Panel>
      </div>

      <Panel
        title="Latest activity"
        actions={
          <>
            <LivePill />
            <Link className="us-btn us-btn-ghost us-btn-sm" href="/urban-sprint/admin/activity">
              All activity
            </Link>
          </>
        }
      >
        {feed.length === 0 ? (
          <p className="us-panel-empty">No stations have been confirmed yet.</p>
        ) : (
          <ul className="us-feed">
            {feed.map((row) => (
              <li key={row.id} className={row.status === "void" ? "is-void" : undefined}>
                <div>
                  <p className="us-feed-title">
                    {row.teamName} → {row.stationName}
                  </p>
                  <p className="us-feed-meta">
                    {row.categoryName} · {row.gamemasterName} · {timeAgo(row.createdAt)}
                    {row.status === "void" && " · voided"}
                  </p>
                </div>
                <span className="us-feed-points">
                  +{points(row.totalPoints)}
                  {row.boosterApplied && <i>boosted</i>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="us-adminstat">
      <p className="us-adminstat-label">{label}</p>
      <p className="us-adminstat-value">{value}</p>
      {note && <p className="us-adminstat-note">{note}</p>}
    </div>
  );
}
