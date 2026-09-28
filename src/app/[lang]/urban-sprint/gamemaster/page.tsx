import Link from "next/link";
import { Icon } from "@/app/components/Icons";
import { requireRole } from "@/lib/urban-sprint/auth";
import { formatBookingDate, formatSlotTime, malaysiaToday } from "@/lib/urban-sprint/booking-config";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import {
  getBookingByReference,
  getBookingSummaries,
  type BookingSummary,
} from "@/lib/urban-sprint/bookings-db";
import {
  bookingReferenceForTeam,
  getTeamForGamemaster,
  listTeams,
} from "@/lib/urban-sprint/teams-db";
import { listCompletionsForTeam } from "@/lib/urban-sprint/completions-db";
import { RACE_MINUTES, racePhase, raceSeconds } from "@/lib/urban-sprint/race-clock";
import { getStanding } from "@/lib/urban-sprint/results-db";
import { listStationsForTeam } from "@/lib/urban-sprint/stations-db";
import { formatDuration, initials, ordinal, percent, points, timeAgo } from "@/lib/urban-sprint/format";
import type { Team } from "@/lib/urban-sprint/types";
import AppBar from "../_components/AppBar";
import LiveRefresh from "../_components/LiveRefresh";
import TabBar from "../_components/TabBar";
import { Empty, Flash, LivePill } from "../_components/ui";
import { gamemasterTabs } from "../_components/tabs";
import BoosterReveal from "./BoosterReveal";
import RaceTimer from "../_components/RaceTimer";
import SubmitButton from "../_components/SubmitButton";
import FinishRaceButton from "./FinishRaceButton";
import { claimTeamAction, drawBoosterAction, finishRaceAction, startRaceAction } from "./actions";

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
  nobooster: "Draw your booster before starting the race.",
  notstarted: "The race hasn't started yet.",
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
    return (
      <ChooseTeam
        name={session.displayName}
        error={error}
        revision={settings.revision}
        todayOnly={params.show === "today"}
      />
    );
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
  todayOnly,
}: {
  name: string;
  error?: string;
  revision: number;
  todayOnly: boolean;
}) {
  const today = malaysiaToday();
  const allTeams = await listTeams({ activeOnly: true });
  const bookings = await getBookingSummaries(
    allTeams.map(bookingReferenceForTeam).filter((ref): ref is string => ref !== null)
  );
  const bookingOf = (team: Team) => {
    const reference = bookingReferenceForTeam(team);
    return reference ? (bookings.get(reference) ?? null) : null;
  };

  // A finished race can't be run again, and an unpaid booking isn't a team.
  // Soonest race first; teams added by hand, which have no race day, last.
  const teams = allTeams
    .filter((team) => racePhase(team) !== "finished")
    .filter((team) => {
      const booking = bookingOf(team);
      if (bookingReferenceForTeam(team) && booking?.status !== "paid") return false;
      return !todayOnly || booking?.date === today;
    })
    .sort((a, b) => {
      const slotA = bookingOf(a);
      const slotB = bookingOf(b);
      return (
        (slotA ? `${slotA.date} ${slotA.time}` : "9999").localeCompare(
          slotB ? `${slotB.date} ${slotB.time}` : "9999"
        ) || a.name.localeCompare(b.name)
      );
    });
  const available = teams.filter((team) => !team.gamemasterId);
  const running = teams.filter((team) => team.gamemasterId);

  return (
    <>
      {/* Someone else claiming a team while this list is open should remove it
          from the list, not fail on tap — so this screen is live too. */}
      <LiveRefresh revision={revision} intervalMs={4000} />

      <AppBar title={`Hi, ${name}`} subtitle="Choose the team you're running" />

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

        <nav className="us-segment us-choose-views" aria-label="Which teams">
          <Link
            className={`us-segment-btn${todayOnly ? "" : " is-active"}`}
            href="/urban-sprint/gamemaster"
            aria-current={todayOnly ? undefined : "page"}
            scroll={false}
          >
            All teams
          </Link>
          <Link
            className={`us-segment-btn${todayOnly ? " is-active" : ""}`}
            href="/urban-sprint/gamemaster?show=today"
            aria-current={todayOnly ? "page" : undefined}
            scroll={false}
          >
            Racing today
          </Link>
        </nav>

        {available.length === 0 ? (
          teams.length === 0 ? (
            <Empty title={todayOnly ? "No teams racing today" : "No teams to run"}>
              {todayOnly
                ? "Nobody is booked to race today. Check All teams, or ask an organiser."
                : "Teams appear here as soon as they book. Ask an organiser if you expected one."}
            </Empty>
          ) : (
            <Empty title="Every team is taken">
              {todayOnly ? "All of today's teams" : "Every team"} already has a gamemaster. Ask an
              organiser to release one.
            </Empty>
          )
        ) : (
          <ul className="us-teamgrid">
            {available.map((team) => (
              <li key={team.id}>
                <form action={claimTeamAction}>
                  <input type="hidden" name="teamId" value={team.id} />
                  <SubmitButton
                    className="us-teamcard"
                    style={{ "--team": team.color } as React.CSSProperties}
                  >
                    <span className="us-teamcard-bar" aria-hidden />
                    <span className="us-teamcard-body">
                      <span className="us-teamcard-name">{team.name}</span>
                      <span className="us-teamcard-meta">{teamCardMeta(bookingOf(team), today)}</span>
                    </span>
                    <span className="us-teamcard-go">
                      <span className="us-idle-label">Claim</span>
                      <span className="us-busy-label">Claiming…</span>
                      <Icon name="check" />
                    </span>
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}

        {running.length > 0 && (
          <section className="us-taken">
            <p className="us-eyebrow">Already claimed</p>
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

/** When a booked team races, and how many; a team added by hand has neither. */
function teamCardMeta(booking: BookingSummary | null, today: string): string {
  if (!booking) return "Added by the organisers";
  const day = booking.date === today ? "Today" : formatBookingDate(booking.date);
  return `${day} · ${formatSlotTime(booking.time)} · ${booking.teamSize} racers`;
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
          <SubmitButton className="us-btn us-btn-primary us-btn-block us-btn-xl" pendingLabel="Drawing…">
            Draw {team.name}&rsquo;s booster
          </SubmitButton>
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
  const reference = bookingReferenceForTeam(team);
  const [standing, recent, stations, booking] = await Promise.all([
    reference ? getStanding(reference) : Promise.resolve({ row: null, total: 0 }),
    listCompletionsForTeam(team.id, 5),
    listStationsForTeam(team.id, team.booster),
    reference ? getBookingByReference(reference) : Promise.resolve(null),
  ]);
  // The gamemaster checks the team in, so they see who's on it.
  const racers = booking?.participants.map((person) => person.fullName) ?? [];

  const remaining = stations.filter((station) => !station.completed);
  const boosted = remaining.filter((station) => station.projected.boosterApplied);
  const booster = team.booster!;
  const phase = racePhase(team);
  const place = standing.row ? ordinal(standing.row.rank) : null;

  return (
    <>
      <LiveRefresh revision={revision} intervalMs={4000} />
      {justDrawn && <BoosterReveal booster={booster} />}

      <AppBar
        title={team.name}
        subtitle={place ? `${place} of ${standing.total}` : "Not on the board yet"}
        accent={team.color}
      />

      <div className="us-page has-tabs">
        {error && <Flash tone="err">{error}</Flash>}

        {phase === "ready" && (
          <section className="us-raceclock is-ready" style={{ "--team": team.color } as React.CSSProperties}>
            <p className="us-eyebrow">Ready to race</p>
            <p className="us-raceclock-time">{formatDuration(RACE_MINUTES * 60)}</p>
            <p className="us-raceclock-note">
              The clock starts when you tap Start. Stations only count while it&rsquo;s running, and
              the race ends at {RACE_MINUTES} minutes.
            </p>
            <form action={startRaceAction}>
              <SubmitButton className="us-btn us-btn-primary us-btn-block us-btn-xl" pendingLabel="Starting…">
                Start race
              </SubmitButton>
            </form>
          </section>
        )}

        {phase === "racing" && team.raceStartedAt && (
          <section className="us-raceclock is-racing" style={{ "--team": team.color } as React.CSSProperties}>
            <p className="us-eyebrow">
              Time left <LivePill label="Racing" />
            </p>
            <p className="us-raceclock-time">
              <RaceTimer startedAt={team.raceStartedAt} mode="remaining" />
            </p>
            <form action={finishRaceAction}>
              <FinishRaceButton />
            </form>
          </section>
        )}

        {phase === "finished" && (
          <section className="us-raceclock is-finished" style={{ "--team": team.color } as React.CSSProperties}>
            <p className="us-eyebrow">Race finished</p>
            <p className="us-raceclock-time">{formatDuration(raceSeconds(team) ?? 0)}</p>
            <p className="us-raceclock-note">
              {points(team.points)} points{place ? ` · ${place} of ${standing.total} on the board` : ""}.
              Well run.
            </p>
          </section>
        )}

        <section className="us-score" style={{ "--team": team.color } as React.CSSProperties}>
          <p className="us-score-label">
            Team score {phase === "racing" && <LivePill />}
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
              <b>{place ?? "—"}</b> place
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

        <Link
          className={`us-btn us-btn-block ${phase === "racing" ? "us-btn-primary us-btn-xl" : "us-btn-ghost"}`}
          href="/urban-sprint/gamemaster/stations"
        >
          {phase === "racing" ? "Browse stations" : phase === "ready" ? "Preview stations" : "View stations"}
          <Icon name="pin" />
        </Link>

        <section className="us-panel">
          <header className="us-panel-head">
            <h2>Squad</h2>
            <span>{booking ? booking.reference : racers.length}</span>
          </header>
          {racers.length === 0 ? (
            <p className="us-panel-empty">This team wasn&rsquo;t booked online, so there&rsquo;s no racer list.</p>
          ) : (
            <ul className="us-roster">
              {racers.map((name, index) => (
                <li key={index}>
                  <i>{initials(name)}</i>
                  {name}
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
            <p className="us-panel-empty">
              {phase === "ready"
                ? "Nothing yet. Start the race, then confirm each station as your team clears it."
                : "Nothing confirmed yet. Stations you confirm show up here."}
            </p>
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
