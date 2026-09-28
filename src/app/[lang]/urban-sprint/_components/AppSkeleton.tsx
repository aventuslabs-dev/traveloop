/**
 * What a phone screen shows the instant a tab is tapped, while the server
 * renders the real one (loading.tsx in gamemaster/ and t/[token]/). On a
 * race-day data connection that can take a second or two, and a tap that
 * does nothing reads as broken. Same bars and blocks as the screens it
 * stands in for, so nothing jumps when they arrive.
 */
export default function AppSkeleton({ tabs = 3 }: { tabs?: number }) {
  return (
    <>
      <header className="us-appbar" aria-hidden>
        <div className="us-appbar-main">
          <span className="us-skel us-skel-title" />
          <span className="us-skel us-skel-sub" />
        </div>
      </header>

      <div className="us-page has-tabs" role="status" aria-busy="true">
        <span className="us-visually-hidden">Loading…</span>
        <span className="us-skel us-skel-hero" aria-hidden />
        <span className="us-skel us-skel-card" aria-hidden />
        <span className="us-skel us-skel-card" aria-hidden />
      </div>

      <nav className="us-tabbar" aria-hidden>
        {Array.from({ length: tabs }, (_, i) => (
          <span key={i} className="us-tab">
            <span className="us-skel us-skel-icon" />
            <span className="us-skel us-skel-label" />
          </span>
        ))}
      </nav>
    </>
  );
}
