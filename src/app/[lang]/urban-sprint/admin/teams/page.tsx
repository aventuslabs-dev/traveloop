import Link from "next/link";
import { Icon } from "@/app/components/Icons";
import { formatBookingDate, formatSlotTime, malaysiaToday } from "@/lib/urban-sprint/booking-config";
import { getBookingSummaries, type BookingSummary } from "@/lib/urban-sprint/bookings-db";
import { teamLinkPath } from "@/lib/urban-sprint/team-link";
import { bookingReferenceForTeam, listTeams } from "@/lib/urban-sprint/teams-db";
import type { Team } from "@/lib/urban-sprint/types";
import { racePhase, raceSeconds } from "@/lib/urban-sprint/race-clock";
import { getBoard } from "@/lib/urban-sprint/results-db";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { formatDuration, ordinal, percent, points } from "@/lib/urban-sprint/format";
import LiveRefresh from "../../_components/LiveRefresh";
import RaceTimer from "../../_components/RaceTimer";
import {
  createTeamAction,
  deleteTeamAction,
  releaseTeamAction,
  updateTeamAction,
} from "../actions";
import ConfirmButton from "../ConfirmButton";
import Dialog from "../Dialog";
import {
  AdminFlash,
  EmptyState,
  FilterLink,
  PageHeader,
  Panel,
  Pill,
  StatGrid,
  Swatch,
  bookingHref,
} from "../ui";

type View = "upcoming" | "today" | "past" | "all";

const VIEWS: { key: View; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "today", label: "Racing today" },
  { key: "past", label: "Past" },
  { key: "all", label: "All" },
];

type Entry = { team: Team; booking: BookingSummary | null };

/**
 * Every team: each paid booking becomes one the moment it's paid, linked by
 * its Booking ID, and organisers can still add one by hand. A team's name
 * opens its booking — racers, passes, payment, result — and the eye opens the
 * page its racers see.
 *
 * Rank is the one leaderboard's — every team, whatever day it raced — so a
 * team has one once its gamemaster starts its race.
 */
export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const view: View = VIEWS.some((v) => v.key === params.view) ? (params.view as View) : "upcoming";
  const today = malaysiaToday();

  const [teams, board, settings] = await Promise.all([listTeams(), getBoard(), getSettings()]);
  const bookings = await getBookingSummaries(
    teams.map(bookingReferenceForTeam).filter((ref): ref is string => ref !== null)
  );

  const entries: Entry[] = teams.map((team) => {
    const reference = bookingReferenceForTeam(team);
    return { team, booking: reference ? (bookings.get(reference) ?? null) : null };
  });

  const inView = entries
    .filter(({ booking }) => {
      // A team added by hand has no race day, so it's always in play.
      if (!booking) return view !== "past";
      if (view === "today") return booking.date === today;
      if (view === "upcoming") return booking.date >= today;
      if (view === "past") return booking.date < today;
      return true;
    })
    .sort((a, b) => raceOrder(a, b, view === "past"));

  const rankOf = new Map(board.map((row) => [row.reference, row.rank]));
  const booked = entries.filter((entry) => entry.booking);
  const racingToday = booked.filter((entry) => entry.booking?.date === today);
  const upcoming = booked.filter((entry) => (entry.booking?.date ?? "") >= today);

  return (
    <>
      <LiveRefresh revision={settings.revision} intervalMs={6000} />

      <PageHeader
        title="Teams"
        subtitle="Every paid booking is a team here, ready for a gamemaster to claim on race day."
        actions={
          <Dialog label="New team" icon="plus" variant="primary" title="New team">
            <p className="usc-hint" style={{ marginBottom: 14 }}>
              For a team that didn&rsquo;t book online. It has no race day, so it&rsquo;s in play every
              day until you make it inactive.
            </p>
            <TeamForm action={createTeamAction} submit="Add team" />
          </Dialog>
        }
      />

      <AdminFlash params={params} />

      <StatGrid
        stats={[
          {
            label: "Registered teams",
            value: booked.length,
            note: `${upcoming.length} still to race`,
          },
          {
            label: "Racers",
            value: upcoming.reduce((sum, entry) => sum + (entry.booking?.teamSize ?? 0), 0),
            note: "in upcoming teams",
          },
          {
            label: "Racing today",
            value: racingToday.length,
            note: `${racingToday.filter((entry) => entry.team.gamemasterId).length} claimed by a gamemaster`,
          },
          {
            label: "Boosters drawn",
            value: teams.filter((team) => team.booster).length,
          },
        ]}
      />

      <div className="usc-toolbar">
        <nav className="ad-filters" aria-label="Which teams">
          {VIEWS.map((option) => (
            <FilterLink
              key={option.key}
              href={
                option.key === "upcoming"
                  ? "/urban-sprint/admin/teams"
                  : `/urban-sprint/admin/teams?view=${option.key}`
              }
              active={view === option.key}
            >
              {option.label}
            </FilterLink>
          ))}
        </nav>
      </div>

      <Panel
        title={VIEWS.find((option) => option.key === view)?.label ?? "Teams"}
        icon="shield"
        count={String(inView.length)}
        padded={false}
      >
        {inView.length === 0 ? (
          <EmptyState icon="shield" title={view === "today" ? "No teams racing today" : "No teams here"}>
            A team appears here as soon as its booking is paid.
          </EmptyState>
        ) : (
          <div className="ad-table-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Race</th>
                  <th className="is-num">Racers</th>
                  <th>Gamemaster</th>
                  <th>Booster</th>
                  <th className="is-num">Stations</th>
                  <th>Race clock</th>
                  <th className="is-num">Points</th>
                  <th className="is-num">Rank</th>
                  <th className="is-num" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {inView.map(({ team, booking }) => {
                  const rank = booking ? rankOf.get(booking.reference) : undefined;
                  const phase = racePhase(team);

                  return (
                    <tr key={team.id} className={team.active ? undefined : "is-dim"}>
                      <td>
                        <span className="ad-cell-stack">
                          <span className="usc-name">
                            <Swatch color={team.color} />
                            {booking ? (
                              <Link className="ad-link" href={bookingHref(booking.reference)}>
                                {team.name}
                              </Link>
                            ) : (
                              team.name
                            )}
                          </span>
                          <span>
                            {booking ? booking.reference : "Added by hand"}
                            {!team.active && " · Inactive"}
                          </span>
                        </span>
                      </td>
                      <td>
                        {booking ? (
                          <span className="ad-cell-stack">
                            <b>{formatBookingDate(booking.date)}</b>
                            <span>
                              {formatSlotTime(booking.time)}
                              {booking.date === today && " · today"}
                            </span>
                          </span>
                        ) : (
                          <span className="usc-muted">Any day</span>
                        )}
                      </td>
                      <td className="is-num">{booking?.teamSize ?? "—"}</td>
                      <td>
                        {team.gamemasterName ? (
                          <Pill label={team.gamemasterName} tone="info" />
                        ) : (
                          <Pill label="Unclaimed" tone="neutral" />
                        )}
                      </td>
                      <td>
                        {team.booster ? (
                          <span className="ad-cell-stack">
                            <b>{team.booster.name}</b>
                            <span>
                              {team.booster.categoryName} · +{percent(team.booster.bonusPercent)}
                            </span>
                          </span>
                        ) : (
                          <span className="usc-muted">Not drawn</span>
                        )}
                      </td>
                      <td className="is-num">{team.stationsCompleted}</td>
                      <td>
                        {phase === "racing" && team.raceStartedAt ? (
                          <span className="usc-name">
                            <Pill label="Racing" tone="info" />
                            <RaceTimer startedAt={team.raceStartedAt} />
                          </span>
                        ) : phase === "finished" ? (
                          <span className="usc-name">
                            <Pill label="Finished" tone="success" />
                            {formatDuration(raceSeconds(team) ?? 0)}
                          </span>
                        ) : (
                          <span className="usc-muted">Not started</span>
                        )}
                      </td>
                      <td className="is-num is-strong">{points(team.points)}</td>
                      <td className="is-num">{rank ? ordinal(rank) : "—"}</td>
                      <td className="is-actions">
                        <span className="ad-actions">
                          {booking?.status === "paid" && (
                            // What the racers see — the same private link they were sent.
                            <a
                              className="ad-icon-btn"
                              href={teamLinkPath(booking.reference)}
                              target="_blank"
                              rel="noreferrer"
                              title="Open the team's page"
                              aria-label={`Open ${team.name}'s team page`}
                            >
                              <Icon name="eye" />
                            </a>
                          )}
                          <Dialog label="Edit" variant="small" title={`Edit ${team.name}`}>
                            <TeamForm action={updateTeamAction} submit="Save team" team={team} />
                            <TeamDanger team={team} booked={booking !== null} />
                          </Dialog>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

/** Soonest race first (latest first for past races); hand-added teams after, by name. */
function raceOrder(a: Entry, b: Entry, latestFirst: boolean): number {
  if (a.booking && b.booking) {
    const slotA = `${a.booking.date} ${a.booking.time}`;
    const slotB = `${b.booking.date} ${b.booking.time}`;
    if (slotA !== slotB) return (slotA < slotB ? -1 : 1) * (latestFirst ? -1 : 1);
  } else if (a.booking || b.booking) {
    return a.booking ? -1 : 1;
  }
  return a.team.name.localeCompare(b.team.name);
}

function TeamForm({
  action,
  submit,
  team,
}: {
  action: (formData: FormData) => Promise<void>;
  submit: string;
  team?: Team;
}) {
  return (
    <form className="usc-form" action={action}>
      {team && <input type="hidden" name="id" value={team.id} />}
      <label className="admin-field">
        <span>Team name</span>
        <input name="name" defaultValue={team?.name} placeholder="Night Owls" required />
      </label>
      <label className="admin-field">
        <span>Colour</span>
        <input name="color" type="color" defaultValue={team?.color ?? "#ff5c38"} />
        <small className="usc-hint">Tints the team&rsquo;s own screens and its leaderboard row.</small>
      </label>
      <label className="ad-check">
        <input type="checkbox" name="active" defaultChecked={team?.active ?? true} />
        <span>
          <b>Available to claim</b>
          Inactive teams leave the board and can&rsquo;t be claimed.
        </span>
      </label>
      <div className="usc-form-foot">
        <button className="ad-btn ad-btn-primary" type="submit">
          {submit}
        </button>
      </div>
    </form>
  );
}

function TeamDanger({ team, booked }: { team: Team; booked: boolean }) {
  return (
    <>
      {team.gamemasterId && (
        <form className="usc-danger" action={releaseTeamAction}>
          <input type="hidden" name="id" value={team.id} />
          <p>
            Frees the team for another gamemaster. The booster it already drew stays — releasing is
            not a redraw.
          </p>
          <ConfirmButton message={`Release ${team.name} from ${team.gamemasterName}?`}>
            Release from {team.gamemasterName}
          </ConfirmButton>
        </form>
      )}
      <form className="usc-danger" action={deleteTeamAction}>
        <input type="hidden" name="id" value={team.id} />
        <p>
          {team.stationsCompleted > 0
            ? "This team has score history — make it inactive instead."
            : booked
              ? "Removes it from the station game only. The booking, its racers and their passes stay."
              : "No score history to lose."}
        </p>
        <ConfirmButton message={`Delete ${team.name}? This can't be undone.`}>Delete team</ConfirmButton>
      </form>
    </>
  );
}
