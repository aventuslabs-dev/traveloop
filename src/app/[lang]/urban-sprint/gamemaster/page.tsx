import Link from "next/link";
import { Icon } from "@/app/components/Icons";
import { requireRole } from "@/lib/urban-sprint/auth";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { getTeamForGamemaster, listTeams } from "@/lib/urban-sprint/teams-db";
import { listCompletionsForTeam } from "@/lib/urban-sprint/completions-db";
import { getStanding } from "@/lib/urban-sprint/leaderboard-db";
import { listStationsForTeam } from "@/lib/urban-sprint/stations-db";
import { initials, ordinal, percent, points, timeAgo } from "@/lib/urban-sprint/format";
import type { Team } from "@/lib/urban-sprint/types";
import AppBar from "../_components/AppBar";
import LiveRefresh from "../_components/LiveRefresh";
import TabBar from "../_components/TabBar";
import { Empty, Flash, LivePill } from "../_components/ui";
import { gamemasterTabs } from "../_components/tabs";
import BoosterReveal from "./BoosterReveal";
import { claimTeamAction, drawBoosterAction } from "./actions";

/**
 * The gamemaster's home, and the whole opening sequence.
 *
 * The three screens below are states of one route rather than three URLs:
 * which one renders is decided by what the gamemaster actually has — no team,
 * a team but no booster, or both. That means the sequence can't be skipped by
 * typing a URL, and a refresh at any point lands exactly where they were.
 */

const ERRORS: Record<string, string> = {
  taken: "Another gamemaster claimed that team first. Pick another.",
  "already-running": "You're already running a team.",
  missing: "That team couldn't be claimed. Try again.",
  noteam: "Claim a team first.",
  noboosters: "No boosters are active yet — ask an organiser to add one.",
};

export default async function GamemasterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireRole("gamemaster");
  const params = await searchParams;

  const [team, settings] = await Promise.all([
    getTeamForGamemaster(session.userId),
    getSettings(),
  ]);

  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;

  if (!team) {
    return <ChooseTeam name={session.displayName} error={error} revision={settings.revision} />;
  }

  if (!team.booster) {
    return <DrawBoosterScreen team={team} error={error} revision={settings.revision} />;
  }

  return (
    <Dashboard
      team={team}
      revision={settings.revision}
      justDrawn={params.drawn === "1"}
      error={error}
    />
  );
}

/* ------------------------------------------------------------------ */
/* 1. Choose a team                                                    */
/* ------------------------------------------------------------------ */

async function ChooseTeam({
  name,
  error,
  revision,
}: {
  name: string;
  error?: string;
  revision: number;
}) {
  const teams = await listTeams({ activeOnly: true });
  const available = teams.filter((team) => !team.gamemasterId);
  const running = teams.filter((team) => team.gamemasterId);

  return (
    <>
      {/* Someone else claiming a team while this list is open should remove it
          from the list, not fail on tap — so this screen is live too. */}
      <LiveRefresh revision={revision} intervalMs={4000} />

      <AppBar title={`Hi, ${name}`} subtitle="Choose the team you're running today" />

      <div className="us-page">
        {error && <Flash tone="err">{error}</Flash>}

        <div className="us-choose-head">
          <p className="us-eyebrow">
            Step 1 of 2 <LivePill label="Live" />
          </p>
          <h1>Pick your team</h1>
          <p className="us-choose-note">
            Claiming locks the team to you for the whole race. No one else can take it after that.
          </p>
        </div>

        {available.length === 0 ? (
          <Empty title="Every team is taken">
            All active teams already have a gamemaster. Ask an organiser to add a team or release
            one.
          </Empty>
        ) : (
          <ul className="us-teamgrid">
            {available.map((team) => (
              <li key={team.id}>
                <form action={claimTeamAction}>
                  <input type="hidden" name="teamId" value={team.id} />
                  <button
                    className="us-teamcard"
                    type="submit"
                    style={{ "--team": team.color } as React.CSSProperties}
                  >
                    <span className="us-teamcard-bar" aria-hidden />
                    <span className="us-teamcard-body">
                      <span className="us-teamcard-name">{team.name}</span>
                      <span className="us-teamcard-meta">
                        {team.members.length === 0
                          ? "No participants yet"
                          : `${team.members.length} participant${team.members.length === 1 ? "" : "s"}`}
                      </span>
                      {team.members.length > 0 && (
                        <span className="us-avatars">
                          {team.members.slice(0, 5).map((member) => (
                            <i key={member.userId} title={member.displayName}>
                              {initials(member.displayName)}
                            </i>
                          ))}
                          {team.members.length > 5 && <i>+{team.members.length - 5}</i>}
                        </span>
                      )}
                    </span>
                    <span className="us-teamcard-go">
                      Claim
                      <Icon name="check" />
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {running.length > 0 && (
          <section className="us-taken">
            <p className="us-eyebrow">Already on course</p>
            <ul>
              {running.map((team) => (
                <li key={team.id} style={{ "--team": team.color } as React.CSSProperties}>
                  <span className="us-taken-dot" aria-hidden />
                  <b>{team.name}</b>
                  <span>{team.gamemasterName}</span>
                  <Icon name="lock" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Draw the booster                                                 */
/* ------------------------------------------------------------------ */

function DrawBoosterScreen({
  team,
  error,
  revision,
}: {
  team: Team;
  error?: string;
  revision: number;
}) {
  return (
    <>
      <LiveRefresh revision={revision} intervalMs={10000} />

      <AppBar title={team.name} subtitle="Step 2 of 2 — draw your booster" accent={team.color} />

      <div className="us-page us-draw">
        {error && <Flash tone="err">{error}</Flash>}

        <div className="us-draw-stage" style={{ "--team": team.color } as React.CSSProperties}>
          <div className="us-draw-orb" aria-hidden>
            <i />
            <i />
            <i />
          </div>

          <h1 className="us-draw-title">One booster. One draw.</h1>
          <p className="us-draw-note">
            Your team gets a single random booster for the whole race. It adds a bonus to every
            station in its category — and it can&rsquo;t be redrawn, so this is it.
          </p>
        </div>

        <form action={drawBoosterAction} className="us-draw-form">
          <button className="us-btn us-btn-primary us-btn-block us-btn-xl" type="submit">
            Draw {team.name}&rsquo;s booster
          </button>
          <p className="us-draw-fineprint">Drawn on the server. No takebacks.</p>
        </form>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Dashboard                                                        */
/* ------------------------------------------------------------------ */

async function Dashboard({
  team,
  revision,
  justDrawn,
  error,
}: {
  team: Team;
  revision: number;
  justDrawn: boolean;
  error?: string;
}) {
  const [standing, recent, stations] = await Promise.all([
    getStanding(team.id),
    listCompletionsForTeam(team.id, 5),
    listStationsForTeam(team.id, team.booster),
  ]);

  const remaining = stations.filter((station) => !station.completed);
  const boosted = remaining.filter((station) => station.projected.boosterApplied);
  const booster = team.booster!;

  return (
    <>
      <LiveRefresh revision={revision} intervalMs={4000} />
      {justDrawn && <BoosterReveal booster={booster} />}

      <AppBar
        title={team.name}
        subtitle={standing.rank ? `${ordinal(standing.rank)} of ${standing.teams}` : "Unranked"}
        accent={team.color}
      />

      <div className="us-page has-tabs">
        {error && <Flash tone="err">{error}</Flash>}

        <section className="us-score" style={{ "--team": team.color } as React.CSSProperties}>
          <p className="us-score-label">
            Team score <LivePill />
          </p>
          <p className="us-score-value">{points(team.points)}</p>
          <div className="us-score-meta">
            <span>
              <b>{team.stationsCompleted}</b> stations done
            </span>
            <span>
              <b>{remaining.length}</b> left
            </span>
            <span>
              <b>{standing.rank ? ordinal(standing.rank) : "—"}</b> place
            </span>
          </div>
        </section>

        <section
          className="us-boostercard"
          style={{ "--cat": booster.categoryColor } as React.CSSProperties}
        >
          <div className="us-boostercard-head">
            <p className="us-eyebrow">Your booster</p>
            <span className="us-boostercard-bonus">+{percent(booster.bonusPercent)}</span>
          </div>
          <p className="us-boostercard-name">{booster.name}</p>
          <p className="us-boostercard-cat">{booster.categoryName}</p>
          <p className="us-boostercard-note">
            {boosted.length > 0
              ? `${boosted.length} station${boosted.length === 1 ? "" : "s"} left where this pays out.`
              : "No boosted stations left — every remaining stop scores at base."}
          </p>
        </section>

        <Link className="us-btn us-btn-primary us-btn-block us-btn-xl" href="/urban-sprint/gamemaster/stations">
          Browse stations
          <Icon name="pin" />
        </Link>

        <section className="us-panel">
          <header className="us-panel-head">
            <h2>Squad</h2>
            <span>{team.members.length}</span>
          </header>
          {team.members.length === 0 ? (
            <p className="us-panel-empty">No participants assigned to this team yet.</p>
          ) : (
            <ul className="us-roster">
              {team.members.map((member) => (
                <li key={member.userId}>
                  <i>{initials(member.displayName)}</i>
                  {member.displayName}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="us-panel">
          <header className="us-panel-head">
            <h2>Recent stops</h2>
            <span>{team.stationsCompleted}</span>
          </header>

          {recent.length === 0 ? (
            <p className="us-panel-empty">Nothing confirmed yet. Your first station starts the clock.</p>
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
      </div>

      <TabBar tabs={gamemasterTabs(remaining.length)} />
    </>
  );
}
