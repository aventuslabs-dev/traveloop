import Link from "next/link";
import { Icon } from "@/app/components/Icons";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { EVENT_STATUSES } from "@/lib/urban-sprint/types";
import { updateSettingsAction, updateWordingAction } from "../actions";
import { AdminFlash, PageHeader, Panel } from "../ui";

const STATUS_LABEL: Record<string, string> = {
  upcoming: "Upcoming — teams still forming",
  live: "Live — race in progress",
  paused: "Paused — play on hold",
  ended: "Ended — final standings",
};

const LIMITS = [25, 50, 100, 200, 0];

/**
 * Everything that changes what the public sees without a deploy: the event's
 * name and status, the default price of a new station, and the wording
 * Traveloop is still finalising for the booking page and emails.
 */
export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const settings = await getSettings();

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Changes apply as soon as you save — no deploy needed."
        actions={
          <>
            <Link className="ad-btn" href="/urban-sprint/book" target="_blank">
              <Icon name="external" />
              Booking page
            </Link>
            <Link className="ad-btn" href="/urban-sprint" target="_blank">
              <Icon name="external" />
              Public site
            </Link>
          </>
        }
      />

      <AdminFlash params={params} />

      <Panel title="Event" icon="flag">
        <form className="usc-form" action={updateSettingsAction}>
          <div className="ad-field-grid">
            <label className="admin-field">
              <span>Event name</span>
              <input name="eventName" defaultValue={settings.eventName} required />
            </label>

            <label className="admin-field">
              <span>Location</span>
              <input name="eventLocation" defaultValue={settings.eventLocation} />
            </label>
          </div>

          <label className="admin-field">
            <span>Tagline</span>
            <input name="eventTagline" defaultValue={settings.eventTagline} />
          </label>

          <div className="ad-field-grid">
            <label className="admin-field">
              <span>Status</span>
              <select name="eventStatus" defaultValue={settings.eventStatus}>
                {EVENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
              <small className="usc-hint">Drives the banner on the public landing page.</small>
            </label>

            <label className="admin-field">
              <span>Default base points</span>
              <input
                name="defaultBasePoints"
                type="number"
                min="0"
                step="0.5"
                defaultValue={settings.defaultBasePoints}
              />
              <small className="usc-hint">New stations start here. Existing stations keep their own value.</small>
            </label>
          </div>

          <div className="usc-form-foot">
            <button className="ad-btn ad-btn-primary" type="submit">
              Save event settings
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Booking wording" icon="book">
        <p className="ad-panel-note">
          Wording Traveloop is still finalising. The booking page, confirmation emails and the public
          leaderboard all read from here. Declaration version in use:{" "}
          <strong>{settings.consentVersion}</strong>.
        </p>

        <form className="usc-form" action={updateWordingAction}>
          <label className="admin-field">
            <span>Rules &amp; Regulations</span>
            <textarea name="rulesText" rows={8} defaultValue={settings.rulesText} required />
            <small className="usc-hint">
              Shown on the booking page before payment and in every confirmation email. One rule per
              line reads as a list. Links are written [Terms &amp; Conditions](/terms).
            </small>
          </label>

          <label className="admin-field">
            <span>Declaration (the &ldquo;I have read and understand&rdquo; checkbox)</span>
            <textarea name="consentText" rows={4} defaultValue={settings.consentText} required />
            <small className="usc-hint">
              Changing this text starts a new version: every booking records the exact wording its
              buyer ticked.
            </small>
          </label>

          <label className="admin-field">
            <span>Public leaderboard shows</span>
            <select name="leaderboardLimit" defaultValue={String(settings.leaderboardLimit)}>
              {!LIMITS.includes(settings.leaderboardLimit) && (
                <option value={settings.leaderboardLimit}>Top {settings.leaderboardLimit}</option>
              )}
              <option value="25">Top 25 only</option>
              <option value="50">Up to Top 50</option>
              <option value="100">Up to Top 100</option>
              <option value="200">Up to Top 200</option>
              <option value="0">All teams</option>
            </select>
            <small className="usc-hint">
              Visitors can switch between Top 25, Top 200 and All teams, up to this limit. Anyone can
              still look up their own ranking with their Booking ID.
            </small>
          </label>

          <div className="usc-form-foot">
            <button className="ad-btn ad-btn-primary" type="submit">
              Save wording
            </button>
          </div>
        </form>
      </Panel>
    </>
  );
}
