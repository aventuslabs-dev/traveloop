import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUrbanSprintSession, ROLE_HOME } from "@/lib/urban-sprint/auth";
import { getSettings } from "@/lib/urban-sprint/settings-db";
import { StatusPill, Wordmark } from "../_components/ui";
import { login } from "./actions";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  "1": "That email and password don't match an Urban Sprint account.",
  noaccess:
    "That account isn't registered for Urban Sprint. Ask an organiser to add you, or use the Traveloop customer portal instead.",
};

export default async function UrbanSprintLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const session = await getUrbanSprintSession();

  // Already signed in as an Urban Sprint user — the form would only be a
  // detour back to where they already belong.
  if (session) redirect(ROLE_HOME[session.role]);

  const settings = await getSettings();
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  const next = typeof params.next === "string" ? params.next : "";

  return (
    <main className="us-login">
      {/* Left: what this is. Someone arriving from a printed QR code needs to
          know which race they're signing in to before they type anything. */}
      <section className="us-login-brand">
        <Wordmark />

        <div className="us-login-brandbody">
          <StatusPill status={settings.eventStatus} />
          <h1>{settings.eventName}</h1>
          <p>{settings.eventTagline}</p>

          <ul className="us-login-roles">
            <li>
              <b>Gamemasters</b>
              <span>Claim your team, draw a booster, confirm stations on the move.</span>
            </li>
            <li>
              <b>Participants</b>
              <span>Follow your team&rsquo;s score, booster and rank as it happens.</span>
            </li>
            <li>
              <b>Organisers</b>
              <span>Run teams, stations, boosters and the score history.</span>
            </li>
          </ul>
        </div>

        <p className="us-login-brandfoot">
          <Link href="/urban-sprint/leaderboard">View the public leaderboard →</Link>
        </p>
      </section>

      <section className="us-login-panel">
        <form className="us-login-card" action={login}>
          <p className="us-eyebrow">Urban Sprint</p>
          <h2>Sign in</h2>
          <p className="us-login-sub">Use the credentials your organiser gave you.</p>

          {error && (
            <p className="us-flash us-flash-err" role="alert">
              {error}
            </p>
          )}

          <input type="hidden" name="next" value={next} />

          <label className="us-field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              required
              autoFocus
            />
          </label>

          <label className="us-field">
            <span>Password</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>

          <button className="us-btn us-btn-primary us-btn-block us-btn-lg" type="submit">
            Enter the race
          </button>

          <p className="us-login-foot">
            Urban Sprint accounts are separate from Traveloop customer accounts. Shopping for a
            pass? <Link href="/account/login">Customer portal</Link>.
          </p>
        </form>
      </section>
    </main>
  );
}
