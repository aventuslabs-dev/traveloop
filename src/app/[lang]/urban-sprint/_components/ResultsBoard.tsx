import type { CSSProperties } from "react";
import { formatBookingDate, formatSlotTime } from "@/lib/urban-sprint/booking-config";
import { formatDuration, ordinal, points } from "@/lib/urban-sprint/format";
import type { ResultRow } from "@/lib/urban-sprint/results-db";
import RaceTimer from "./RaceTimer";
import { Empty } from "./ui";

/**
 * The leaderboard, drawn. Every board in the app — the public page, the
 * landing preview, a team's page, the gamemaster's — renders the same rows
 * from results-db.getBoard(): every team, whatever day it raced, by points
 * then time. Ranks arrive computed, so this only draws them.
 *
 * A team on the course right now is marked Racing, and its time ticks.
 * Booking IDs are not shown — the board is public, and a team finds its own
 * row through "Check my ranking" or its team page, which highlight it.
 *
 * With `podium`, the first three stand on a winners' podium above the list
 * (the landing page). Every row carries a bar for its points as a share of
 * the leader's, so the gap to the top reads at a glance.
 */
export default function ResultsBoard({
  rows,
  highlightReference,
  compact = false,
  podium = false,
}: {
  rows: ResultRow[];
  highlightReference?: string | null;
  /** Previews: drops the race date. */
  compact?: boolean;
  /** Stand the top three on a podium above the rest. */
  podium?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <Empty title="No teams on the board yet">
        Teams appear here the moment their race starts.
      </Empty>
    );
  }

  const top = Math.max(0, ...rows.map((row) => row.points));
  const share = (row: ResultRow) => (top > 0 ? Math.max(0.04, row.points / top) : 0);
  const stage = podium && rows.length >= 3 ? rows.slice(0, 3) : [];
  const rest = rows.slice(stage.length);

  return (
    <>
      {stage.length > 0 && (
        <ol className="us-podium" aria-label="Top three">
          {stage.map((row, i) => {
            const mine = highlightReference === row.reference;
            return (
              <li
                key={row.reference}
                id={mine ? "my-team" : undefined}
                className={`us-podium-spot is-p${i + 1} is-m${Math.min(row.rank, 3)}${mine ? " is-mine" : ""}`}
                style={teamColor(row)}
              >
                <div className="us-podium-player">
                  {row.rank === 1 && <Crown />}
                  <span className="us-podium-avatar" aria-hidden>
                    {initials(row.teamName)}
                  </span>
                  <p className="us-podium-name">{row.teamName}</p>
                  {(mine || row.racing) && (
                    <p className="us-podium-tags">
                      {mine && <span className="us-lb-you">You</span>}
                      {row.racing && <span className="us-lb-racing">Racing</span>}
                    </p>
                  )}
                  <p className="us-podium-points">
                    {points(row.points)}
                    <i>pts</i>
                  </p>
                  <p className={`us-podium-time${row.racing ? " is-racing" : ""}`}>
                    <Time row={row} />
                  </p>
                </div>
                <div className="us-podium-block">
                  <b aria-label={`${ordinal(row.rank)} place`}>{row.rank}</b>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {rest.length > 0 && (
        <ol className="us-lb is-results" start={stage.length + 1}>
          {rest.map((row) => {
            const mine = highlightReference === row.reference;
            const medal = row.rank <= 3;

            return (
              <li
                key={row.reference}
                id={mine ? "my-team" : undefined}
                className={`us-lb-row${mine ? " is-mine" : ""}${medal ? " is-podium" : ""}${
                  row.racing ? " is-racing" : ""
                }`}
                style={{ ...teamColor(row), "--share": share(row) } as CSSProperties}
              >
                <span
                  className={`us-lb-rank${medal ? ` is-p${row.rank}` : ""}`}
                  aria-label={`${ordinal(row.rank)} place`}
                >
                  {row.rank}
                </span>

                <div className="us-lb-team">
                  <p className="us-lb-name">
                    {row.teamName}
                    {mine && <span className="us-lb-you">You</span>}
                    {row.racing && <span className="us-lb-racing">Racing</span>}
                  </p>
                  {!compact && (
                    <p className="us-lb-meta">
                      {formatBookingDate(row.date)} · {formatSlotTime(row.time)} race · {row.teamSize}{" "}
                      racers
                    </p>
                  )}
                </div>

                <span className="us-lb-score">
                  <span className="us-lb-points">
                    {points(row.points)}
                    <i>pts</i>
                  </span>
                  <span className="us-lb-time">
                    <Time row={row} />
                  </span>
                </span>

                <span className="us-lb-bar" aria-hidden />
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

function Time({ row }: { row: ResultRow }) {
  return (
    <>
      <span className="us-visually-hidden">{row.racing ? "Time so far " : "Time "}</span>
      {row.racing && row.startedAt ? <RaceTimer startedAt={row.startedAt} /> : formatDuration(row.seconds)}
    </>
  );
}

function teamColor(row: ResultRow): CSSProperties | undefined {
  return row.color ? ({ "--team": row.color } as CSSProperties) : undefined;
}

/** "Batik Bandits" -> "BB", "The Night Owls" -> "NO": a player badge's two letters. */
function initials(name: string): string {
  const words = name.split(/\s+/).filter((word) => word && !/^the$/i.test(word));
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? name).slice(0, 2);
  return letters.toUpperCase();
}

function Crown() {
  return (
    <svg className="us-podium-crown" viewBox="0 0 32 24" width="32" height="24" aria-hidden>
      <path
        d="M3 8l6.5 5L16 3l6.5 10L29 8l-2.6 12.5H5.6z"
        fill="currentColor"
        stroke="rgba(6,19,41,0.35)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <circle cx="3" cy="7.5" r="2" fill="currentColor" />
      <circle cx="16" cy="2.5" r="2" fill="currentColor" />
      <circle cx="29" cy="7.5" r="2" fill="currentColor" />
    </svg>
  );
}
