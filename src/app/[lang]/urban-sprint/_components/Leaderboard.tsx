import { points } from "@/lib/urban-sprint/format";
import type { LeaderboardRow } from "@/lib/urban-sprint/types";
import { Empty } from "./ui";

/**
 * The one leaderboard rendering, used by the public board, the landing-page
 * preview, the gamemaster and participant views and the admin console.
 *
 * Ranks arrive already computed by the SQL view, so nothing here decides
 * position — this only draws it. `highlightTeamId` marks the viewer's own team
 * so a gamemaster can find their row at a glance while walking.
 */
export default function Leaderboard({
  rows,
  highlightTeamId,
  compact = false,
}: {
  rows: LeaderboardRow[];
  highlightTeamId?: number | null;
  /** Landing-page preview: drops the booster column and the stations count. */
  compact?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <Empty title="No teams on the board yet">
        Standings appear here as soon as the first station is confirmed.
      </Empty>
    );
  }

  return (
    <ol className={`us-lb${compact ? " is-compact" : ""}`}>
      {rows.map((row) => {
        const mine = highlightTeamId === row.id;

        return (
          <li
            key={row.id}
            className={`us-lb-row${mine ? " is-mine" : ""}${row.rank <= 3 ? " is-podium" : ""}`}
            style={{ "--team": row.color } as React.CSSProperties}
          >
            <span className={`us-lb-rank${row.rank <= 3 ? ` is-p${row.rank}` : ""}`}>
              {row.rank}
            </span>

            <div className="us-lb-team">
              <p className="us-lb-name">
                {row.name}
                {mine && <span className="us-lb-you">You</span>}
              </p>

              {!compact && (
                <p className="us-lb-meta">
                  {row.boosterName ? (
                    <span className="us-lb-booster">
                      {row.boosterName}
                      <em>+{points(row.bonusPercent ?? 0)}%</em>
                    </span>
                  ) : (
                    <span className="us-lb-booster is-empty">No booster drawn</span>
                  )}
                </p>
              )}
            </div>

            {!compact && (
              <span className="us-lb-stations">
                {row.stationsCompleted}
                <i>stations</i>
              </span>
            )}

            <span className="us-lb-points">
              {points(row.points)}
              <i>pts</i>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
