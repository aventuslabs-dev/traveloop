import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { getBoard, type ResultRow } from "@/lib/urban-sprint/results-db";
import { formatDuration, points } from "@/lib/urban-sprint/format";
import { RACE_MINUTES } from "@/lib/urban-sprint/race-clock";
import FindTeam from "./_components/FindTeam";
import GameEntrance from "./_components/GameEntrance";
import LiveRefresh from "./_components/LiveRefresh";
import ResultsBoard from "./_components/ResultsBoard";
import SprintNav from "./_components/SprintNav";
import { Empty, LivePill, Wordmark } from "./_components/ui";

/**
 * The whole public campaign, on one page: the course, the way back in for
 * racers who've booked, and the leaderboard.
 *
 * It opens like a game (GameEntrance.tsx): a loading screen, then the sky over
 * Penang, then a fall through the clouds onto George Town while the landmarks
 * load onto the board, ending on the playable 3D map, whose own card carries
 * the sign-up. One scroll from the board lands on the next screen: racers who
 * already have a Booking ID get a way to their team page, and everyone sees
 * who they'd be racing. Everything else (times, rules, forms) lives on the
 * booking page, one click away. The old standalone /urban-sprint/leaderboard
 * redirects here (next.config.ts).
 */

const SIGN_UP = "/urban-sprint/book";

/**
 * The views the board offers, capped by the console's display limit (0 = no
 * cap). With the cap at 200 that's Top 25 / Top 200; uncapped it adds "All".
 */
function boardViews(limit: number): number[] {
  const views = [25, 200].filter((size) => limit === 0 || size < limit);
  views.push(limit);
  return views;
}

function viewLabel(size: number): string {
  return size === 0 ? "All teams" : `Top ${size}`;
}

/**
 * Title and description come from the layout; this adds the pair of tags the
 * layout cannot know — which URL is canonical, and where the other locale's
 * copy of this page lives. Both are in the sitemap, so both need them.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return { alternates: localeAlternates(lang, "/urban-sprint") };
}

export default async function UrbanSprintLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [params, settings, board] = await Promise.all([
    searchParams,
    getSettings(),
    // A marketing page never errors on the board: null says "not right now"
    // in place of the rows, and the page around it carries on.
    getBoard().catch((error): ResultRow[] | null => {
      console.error("[us-landing] Couldn't load results:", error);
      return null;
    }),
  ]);

  const views = boardViews(settings.leaderboardLimit);
  const requested = Number(params.show);
  const show = views.includes(requested) ? requested : views[0];
  const rows = board && show > 0 ? board.slice(0, show) : board;
  const total = board?.length ?? 0;
  const leader = board?.[0];

  return (
    <main className="us-public us-landing">
      {/* The board on this page moves on its own, but nobody is acting on it
          second by second — a slower tick than the gamemaster's. */}
      <LiveRefresh revision={settings.revision} intervalMs={8000} />

      <SprintNav live={settings.eventStatus === "live"} />

      {/* -------------------------------------------------------- Entrance */}
      <GameEntrance raceMinutes={RACE_MINUTES} signUpHref={SIGN_UP} />
      {/* Without scripts there is no loader to press start on and no scroll
          timeline to play, so the entrance is just its opening screen, and
          the bar (which otherwise waits for the board) is up from the start. */}
      <noscript>
        <style>
          {".us-boot{display:none}.us-entrance{height:auto}" +
            ".us-landing .us-nav{translate:none!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important}"}
        </style>
      </noscript>

      {/* One screen under the bar, where the scroll from the board lands:
          the way to a team page, then the board. */}
      <div className="us-after">
        {/* Already booked? The Booking ID box, for racers after their team page. */}
        <FindTeam />

        {/* ----------------------------------------------------------- Board */}
        <section className="us-board" id="leaderboard" aria-labelledby="us-board-title">
          <div className="us-shell">
            <header className="us-sechead">
              <div>
                <p className="us-kicker is-light">
                  Leaderboard <LivePill label="Live" />
                </p>
                <h2 id="us-board-title">
                  {leader ? (
                    <>
                      {leader.teamName} <em>leads.</em>
                    </>
                  ) : (
                    <>
                      The board is <em>wide open.</em>
                    </>
                  )}
                </h2>
                <p className="us-sechead-note">
                  {leader
                    ? `${points(leader.points)} points in ${formatDuration(leader.seconds)} · ${total} ${total === 1 ? "team" : "teams"} ranked.`
                    : "First team on the board sets the pace."}
                </p>
              </div>

              {views.length > 1 && total > 0 && (
                <nav className="us-segment us-boardviews" aria-label="How many teams to show">
                  {views.map((size) => (
                    <Link
                      key={size}
                      className={`us-segment-btn${size === show ? " is-active" : ""}`}
                      href={`/urban-sprint?show=${size}#leaderboard`}
                      aria-current={size === show ? "page" : undefined}
                      scroll={false}
                    >
                      {viewLabel(size)}
                    </Link>
                  ))}
                </nav>
              )}
            </header>

            {!rows ? (
              <Empty title="Results aren't available right now">Please try again in a minute.</Empty>
            ) : (
              rows.length > 0 && <ResultsBoard rows={rows} podium />
            )}

            {/* The open row: the board's last line is the visitor's team, and
                the score to beat is the challenge. */}
            <Link className="us-lb-open" href={SIGN_UP}>
              <span className="us-lb-open-rank" aria-hidden>
                ?
              </span>
              <span className="us-lb-open-team">
                <b>Your team here</b>
                <span>
                  {leader
                    ? `Beat ${points(leader.points)} points and take the crown.`
                    : "Race first and set the score to beat."}
                </span>
              </span>
              <span className="us-lb-open-go">
                <span className="us-lb-open-go-text">Book your race</span>
                <span aria-hidden>→</span>
              </span>
            </Link>

            <p className="us-board-foot">
              Every race is {RACE_MINUTES} minutes. Most points wins; on the same points, the faster
              time ranks higher. Teams on the course right now are shown live.
            </p>
          </div>
        </section>
      </div>

      <footer className="us-footer">
        <div className="us-shell us-footer-inner">
          <Wordmark />
          <p>
            Urban Sprint is a campaign by <Link href="/">Traveloop</Link> — the premier tourist pass
            for Malaysia.
          </p>
          <nav aria-label="Urban Sprint footer">
            <Link href={SIGN_UP}>Sign up</Link>
            <a href="#leaderboard">Leaderboard</a>
            <Link href="/urban-sprint/login">Staff login</Link>
            <Link href="/">Traveloop</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
