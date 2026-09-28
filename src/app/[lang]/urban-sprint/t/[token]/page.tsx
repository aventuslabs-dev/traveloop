import Link from "next/link";
import {
  arrivalTime,
  formatBookingDate,
  formatSlotTime,
  malaysiaToday,
} from "@/lib/urban-sprint/booking-config";
import { listCompletionsForTeam } from "@/lib/urban-sprint/completions-db";
import { formatDuration, initials, ordinal, percent, points, timeAgo } from "@/lib/urban-sprint/format";
import { racePhase } from "@/lib/urban-sprint/race-clock";
import { getBoard } from "@/lib/urban-sprint/results-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import AppBar from "../../_components/AppBar";
import RaceTimer from "../../_components/RaceTimer";
import ResultsBoard from "../../_components/ResultsBoard";
import LiveRefresh from "../../_components/LiveRefresh";
import TabBar from "../../_components/TabBar";
import { LivePill } from "../../_components/ui";
import { teamLinkTabs } from "../../_components/tabs";
import { loadTeamLink } from "./load";

/**
 * A booked team's home, from its private link: the race; then, once the
 * gamemaster starts the clock, the time left, live score, booster and
 * stations; then the final result. The board is the one board — every team,
 * whatever day it raced. Everything here is read-only; confirming a station is
 * the gamemaster's job, and the actions that do it are gated on that role.
 */
export default async function TeamLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // The board and settings don't depend on the team, so they load alongside
  // it; only the team's own stops have to wait for its id.
  const [{ base, booking, team, color }, settings, board] = await Promise.all([
    loadTeamLink(token),
    getSettings(),
    getBoard(),
  ]);
  const recent = team ? await listCompletionsForTeam(team.id, 8) : [];
  const upcoming = booking.date > malaysiaToday();
  const phase = team ? racePhase(team) : "ready";

  const mine = board.find((row) => row.reference === booking.reference) ?? null;
  const slot = `${formatBookingDate(booking.date)}, ${formatSlotTime(booking.time)}`;
  const place = mine ? `${ordinal(mine.rank)} of ${board.length}` : null;

  return (
    <>
      <LiveRefresh revision={settings.revision} intervalMs={phase === "racing" ? 5000 : 30000} />

      <AppBar
        title={booking.teamName}
        subtitle={
          mine && !mine.racing
            ? `Finished · ${place}`
            : mine
              ? `Racing · ${place}`
              : upcoming
                ? `Racing ${slot}`
                : "Urban Sprint"
        }
        accent={color}
        signOut={false}
      />

      <div className="us-page has-tabs">
        {mine && !mine.racing ? (
          <section className="us-score" style={{ "--team": color } as React.CSSProperties}>
            <p className="us-score-label">Your result</p>
            <p className="us-score-value">{points(mine.points)}</p>
            <div className="us-score-meta">
              <span>
                <b>{formatDuration(mine.seconds)}</b> time
              </span>
              <span>
                <b>{ordinal(mine.rank)}</b> of {board.length}
              </span>
            </div>
          </section>
        ) : team && phase === "racing" && team.raceStartedAt ? (
          <>
            <section className="us-raceclock is-racing" style={{ "--team": color } as React.CSSProperties}>
              <p className="us-eyebrow">
                Time left <LivePill label="Racing" />
              </p>
              <p className="us-raceclock-time">
                <RaceTimer startedAt={team.raceStartedAt} mode="remaining" />
              </p>
            </section>
            <section className="us-score" style={{ "--team": color } as React.CSSProperties}>
              <p className="us-score-label">
                Team score <LivePill />
              </p>
              <p className="us-score-value">{points(team.points)}</p>
              <div className="us-score-meta">
                <span>
                  <b>{team.stationsCompleted}</b> stations
                </span>
                <span>
                  <b>{mine ? ordinal(mine.rank) : "—"}</b> place
                </span>
                <span>
                  <b>{booking.teamSize}</b> racers
                </span>
              </div>
            </section>
          </>
        ) : null}

        <section className="us-panel">
          <header className="us-panel-head">
            <h2>Your race</h2>
            <span>{booking.reference}</span>
          </header>
          <dl className="us-race">
            <div>
              <dt>Date</dt>
              <dd>{formatBookingDate(booking.date)}</dd>
            </div>
            <div>
              <dt>Arrive by</dt>
              <dd>{formatSlotTime(arrivalTime(booking.time))}</dd>
            </div>
            <div>
              <dt>Challenge time</dt>
              <dd>{formatSlotTime(booking.time)}</dd>
            </div>
            <div>
              <dt>Racers</dt>
              <dd>{booking.teamSize}</dd>
            </div>
            <div>
              <dt>Gamemaster</dt>
              <dd>
                {team?.gamemasterName ? (
                  <span className="us-race-gm">
                    <i>{initials(team.gamemasterName)}</i>
                    {team.gamemasterName}
                  </span>
                ) : (
                  <span className="us-race-muted">Assigned on race day</span>
                )}
              </dd>
            </div>
          </dl>
          {phase === "ready" && (
            <p className="us-panel-empty">
              Quote your Booking ID at check-in. Once your gamemaster starts the clock, this page
              fills in live: time left, your booster, every station you clear, and where you stand.
            </p>
          )}
        </section>

        {team &&
          (team.booster ? (
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
          ))}

        {team && phase !== "ready" && (
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
        )}

        {board.length > 0 && (
          <section className="us-panel">
            <header className="us-panel-head">
              <h2>
                Leaderboard <LivePill />
              </h2>
              <Link href={`${base}/leaderboard`}>Full board</Link>
            </header>

            <ResultsBoard rows={board.slice(0, 5)} highlightReference={booking.reference} compact />
          </section>
        )}
      </div>

      <TabBar tabs={teamLinkTabs(base)} />
    </>
  );
}
