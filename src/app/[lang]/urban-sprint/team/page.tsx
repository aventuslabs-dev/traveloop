import Link from "next/link";
import { requireRole } from "@/lib/urban-sprint/auth";
import { listCompletionsForTeam } from "@/lib/urban-sprint/completions-db";
import { getLeaderboard, getStanding } from "@/lib/urban-sprint/leaderboard-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { getTeamForParticipant } from "@/lib/urban-sprint/teams-db";
import { initials, ordinal, percent, points, timeAgo } from "@/lib/urban-sprint/format";
import AppBar from "../_components/AppBar";
import Leaderboard from "../_components/Leaderboard";
import LiveRefresh from "../_components/LiveRefresh";
import TabBar from "../_components/TabBar";
import { Empty, LivePill } from "../_components/ui";
import { PARTICIPANT_TABS } from "../_components/tabs";

/**
 * The participant view: everything about their own race, and nothing they can
 * change. There is deliberately no completion control here — confirming a
 * station is the gamemaster's job, and the actions that do it are gated on
 * that role, so this is a read-only surface by construction rather than by
 * hiding a button.
 */

export default async function ParticipantPage() {
  const session = await requireRole("participant");
  const [team, settings] = await Promise.all([
    getTeamForParticipant(session.userId),
    getSettings(),
  ]);

  if (!team) {
    return (
      <>
        <LiveRefresh revision={settings.revision} intervalMs={6000} />
        <AppBar title={`Hi, ${session.displayName}`} subtitle="Urban Sprint" />

        <div className="us-page has-tabs">
          <Empty title="You're not on a team yet">
            An organiser will assign you to one before the race starts. This page fills in the
            moment they do.
          </Empty>

          <Link className="us-btn us-btn-ghost us-btn-block" href="/urban-sprint/team/leaderboard">
            View the leaderboard
          </Link>
        </div>

        <TabBar tabs={PARTICIPANT_TABS} />
      </>
    );
  }

  const [standing, recent, board] = await Promise.all([
    getStanding(team.id),
    listCompletionsForTeam(team.id, 8),
    getLeaderboard(5),
  ]);

  return (
    <>
      <LiveRefresh revision={settings.revision} intervalMs={5000} />

      <AppBar
        title={team.name}
        subtitle={standing.rank ? `${ordinal(standing.rank)} of ${standing.teams}` : "Unranked"}
        accent={team.color}
      />

      <div className="us-page has-tabs">
        <section className="us-score" style={{ "--team": team.color } as React.CSSProperties}>
          <p className="us-score-label">
            Team score <LivePill />
          </p>
          <p className="us-score-value">{points(team.points)}</p>
          <div className="us-score-meta">
            <span>
              <b>{team.stationsCompleted}</b> stations
            </span>
            <span>
              <b>{standing.rank ? ordinal(standing.rank) : "—"}</b> place
            </span>
            <span>
              <b>{team.members.length}</b> in squad
            </span>
          </div>
        </section>

        {team.booster ? (
          <section
            className="us-boostercard"
            style={{ "--cat": team.booster.categoryColor } as React.CSSProperties}
          >
            <div className="us-boostercard-head">
              <p className="us-eyebrow">Team booster</p>
              <span className="us-boostercard-bonus">+{percent(team.booster.bonusPercent)}</span>
            </div>
            <p className="us-boostercard-name">{team.booster.name}</p>
            <p className="us-boostercard-cat">{team.booster.categoryName}</p>
            <p className="us-boostercard-note">
              Every {team.booster.categoryName} station scores {percent(team.booster.bonusPercent)}{" "}
              more for your team.
            </p>
          </section>
        ) : (
          <section className="us-boostercard is-pending">
            <p className="us-eyebrow">Team booster</p>
            <p className="us-boostercard-name">Not drawn yet</p>
            <p className="us-boostercard-note">
              Your gamemaster draws it once at the start of the race.
            </p>
          </section>
        )}

        <section className="us-panel">
          <header className="us-panel-head">
            <h2>Your squad</h2>
            <span>{team.members.length}</span>
          </header>

          <p className="us-gmline">
            <i>{initials(team.gamemasterName ?? "?")}</i>
            <span>
              <b>{team.gamemasterName ?? "Not assigned"}</b>
              Gamemaster
            </span>
          </p>

          {team.members.length === 0 ? (
            <p className="us-panel-empty">No participants listed yet.</p>
          ) : (
            <ul className="us-roster">
              {team.members.map((member) => (
                <li key={member.userId} className={member.userId === session.userId ? "is-you" : undefined}>
                  <i>{initials(member.displayName)}</i>
                  {member.displayName}
                  {member.userId === session.userId && <em>you</em>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="us-panel">
          <header className="us-panel-head">
            <h2>Stations completed</h2>
            <span>{team.stationsCompleted}</span>
          </header>

          {recent.length === 0 ? (
            <p className="us-panel-empty">Nothing yet — your first stop will show up here.</p>
          ) : (
            <ul className="us-feed">
              {recent.map((row) => (
                <li key={row.id} className={row.status === "void" ? "is-void" : undefined}>
                  <div>
                    <p className="us-feed-title">{row.stationName}</p>
                    <p className="us-feed-meta">
                      {row.categoryName} · {timeAgo(row.createdAt)}
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
        </section>

        <section className="us-panel">
          <header className="us-panel-head">
            <h2>
              Leaderboard <LivePill />
            </h2>
            <Link href="/urban-sprint/team/leaderboard">Full board</Link>
          </header>

          <Leaderboard rows={board} highlightTeamId={team.id} compact />
        </section>
      </div>

      <TabBar tabs={PARTICIPANT_TABS} />
    </>
  );
}
