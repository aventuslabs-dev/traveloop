import Link from "next/link";
import { getUrbanSprintSession, ROLE_HOME } from "@/lib/urban-sprint/auth";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { getLeaderboard } from "@/lib/urban-sprint/leaderboard-db";
import { getCampaignStats } from "@/lib/urban-sprint/stats-db";
import { points } from "@/lib/urban-sprint/format";
import Leaderboard from "./_components/Leaderboard";
import LiveRefresh from "./_components/LiveRefresh";
import { LivePill, StatusPill, Wordmark, statusNote } from "./_components/ui";

/**
 * The public face of the campaign. No login required, and no login *implied* —
 * a spectator should be able to follow the race from a poster QR code without
 * ever seeing a form.
 */

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Teams assemble",
    body: "Every team is handed to a gamemaster who runs the route with them and confirms each stop.",
  },
  {
    step: "02",
    title: "Draw a booster",
    body: "Each team draws one booster at random. It multiplies every station in its category — and it is drawn once.",
  },
  {
    step: "03",
    title: "Sprint the city",
    body: "Stations are real partner shops. Reach one, do what it asks, and the gamemaster confirms it on the spot.",
  },
  {
    step: "04",
    title: "Watch the board move",
    body: "Points land the moment a station is confirmed, booster bonus included. The leaderboard reorders live.",
  },
];

export default async function UrbanSprintLandingPage() {
  const [settings, board, stats, session] = await Promise.all([
    getSettings(),
    getLeaderboard(5),
    getCampaignStats(),
    getUrbanSprintSession(),
  ]);

  const leader = board[0];

  return (
    <main className="us-public">
      {/* The board on this page moves on its own, but nobody is acting on it
          second by second — a slower tick than the gamemaster's. */}
      <LiveRefresh revision={settings.revision} intervalMs={8000} />

      <header className="us-topbar">
        <Wordmark />
        <nav className="us-topbar-nav" aria-label="Urban Sprint">
          <a href="#how">How it works</a>
          <Link href="/urban-sprint/leaderboard">Leaderboard</Link>
        </nav>
        {session ? (
          <Link className="us-btn us-btn-primary us-btn-sm" href={ROLE_HOME[session.role]}>
            Open dashboard
          </Link>
        ) : (
          <Link className="us-btn us-btn-primary us-btn-sm" href="/urban-sprint/login">
            Log in
          </Link>
        )}
      </header>

      <section className="us-hero">
        <div className="us-hero-inner">
          <p className="us-hero-eyebrow">
            A Traveloop campaign · {settings.eventLocation}
          </p>

          <h1 className="us-hero-title">
            <span>Urban</span>
            <span className="us-hero-title-out">Sprint</span>
          </h1>

          <p className="us-hero-tagline">{settings.eventTagline}</p>

          <div className="us-hero-status">
            <StatusPill status={settings.eventStatus} />
            <span className="us-hero-statusnote">{statusNote(settings.eventStatus)}</span>
          </div>

          <div className="us-hero-cta">
            <Link className="us-btn us-btn-primary us-btn-lg" href="/urban-sprint/leaderboard">
              View the leaderboard
            </Link>
            <Link className="us-btn us-btn-ghost us-btn-lg" href="/urban-sprint/login">
              {session ? "Go to my dashboard" : "Team login"}
            </Link>
          </div>

          <dl className="us-hero-stats">
            <div>
              <dt>Teams racing</dt>
              <dd>{stats.teams}</dd>
            </div>
            <div>
              <dt>Stations</dt>
              <dd>{stats.stations}</dd>
            </div>
            <div>
              <dt>Stations cleared</dt>
              <dd>{stats.completions}</dd>
            </div>
            <div>
              <dt>Points awarded</dt>
              <dd>{points(stats.pointsAwarded)}</dd>
            </div>
          </dl>
        </div>

        <div className="us-hero-grid" aria-hidden />
      </section>

      <section className="us-how" id="how">
        <div className="us-shell">
          <p className="us-eyebrow">How it works</p>
          <h2 className="us-how-title">Four moves, ninety minutes, one board.</h2>

          <ol className="us-steps">
            {HOW_IT_WORKS.map((item) => (
              <li className="us-step" key={item.step}>
                <span className="us-step-num">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ol>

          {/* The worked example is the clearest possible statement of the
              scoring rule, and it's the question every spectator asks first. */}
          <div className="us-mathcard">
            <p className="us-eyebrow">The booster, in one sum</p>
            <div className="us-math">
              <div className="us-math-row">
                <span>ABC Cafe · Food &amp; Beverage</span>
                <b>30</b>
              </div>
              <div className="us-math-row is-bonus">
                <span>Food Booster · +25%</span>
                <b>+7.5</b>
              </div>
              <div className="us-math-row is-total">
                <span>Awarded</span>
                <b>37.5</b>
              </div>
            </div>
            <p className="us-math-note">
              A booster pays out only on stations in its own category. The percentage is set per
              booster by the organisers, so it changes between events without changing the game.
            </p>
          </div>
        </div>
      </section>

      <section className="us-boardsection">
        <div className="us-shell">
          <header className="us-sechead">
            <div>
              <p className="us-eyebrow">
                Standings <LivePill />
              </p>
              <h2>{leader ? `${leader.name} leads` : "The board opens soon"}</h2>
              <p className="us-sechead-note">
                {leader
                  ? `${points(leader.points)} points from ${leader.stationsCompleted} stations.`
                  : "Standings appear as soon as the first station is confirmed."}
              </p>
            </div>
            <div className="us-sechead-actions">
              <Link className="us-btn us-btn-ghost" href="/urban-sprint/leaderboard">
                Full leaderboard
              </Link>
            </div>
          </header>

          <Leaderboard rows={board} compact />

          <Link className="us-btn us-btn-primary us-btn-block" href="/urban-sprint/leaderboard">
            View full leaderboard
          </Link>
        </div>
      </section>

      <footer className="us-footer">
        <div className="us-shell us-footer-inner">
          <Wordmark />
          <p>
            Urban Sprint is a campaign by <Link href="/">Traveloop</Link> — the tourist pass for
            Malaysia.
          </p>
          <nav aria-label="Urban Sprint footer">
            <Link href="/urban-sprint/leaderboard">Leaderboard</Link>
            <Link href="/urban-sprint/login">Log in</Link>
            <Link href="/">Traveloop</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
