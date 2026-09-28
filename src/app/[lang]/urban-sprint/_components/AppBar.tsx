import { logout } from "../login/actions";

/**
 * The top bar for the phone views — the gamemaster's, and a team's link page. Deliberately short: on a 5-inch
 * screen held at arm's length while walking, the vertical space this takes is
 * space the station list doesn't get.
 */
export default function AppBar({
  title,
  subtitle,
  accent,
  right,
  signOut = true,
}: {
  title: string;
  subtitle?: string;
  /** Team colour, so a gamemaster's own screen is tinted like their team. */
  accent?: string;
  right?: React.ReactNode;
  /** Off for a team's link page, which nobody is signed in to. */
  signOut?: boolean;
}) {
  return (
    <header className="us-appbar" style={accent ? ({ "--team": accent } as React.CSSProperties) : undefined}>
      <div className="us-appbar-main">
        <p className="us-appbar-title">{title}</p>
        {subtitle && <p className="us-appbar-sub">{subtitle}</p>}
      </div>

      <div className="us-appbar-right">
        {right}
        {signOut && (
          <form action={logout}>
            <button className="us-appbar-out" type="submit" aria-label="Sign out">
              Sign out
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
