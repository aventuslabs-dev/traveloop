/**
 * Wordless on purpose.
 *
 * Loading UI takes no parameters in this Next.js version, so it cannot be
 * handed the `[lang]` segment and cannot load a dictionary — and the portal is
 * read in two languages. A skeleton in the shape of the booking page says
 * "this is arriving" without a sentence that would be English for half the
 * people who see it, and it holds the layout so nothing jumps when the real
 * page swaps in.
 */
export default function ExperienceBookingLoading() {
  return (
    <div className="xp-book-layout" aria-hidden="true">
      <aside className="xp-book-aside">
        <span className="ad-skel" style={{ height: "180px", borderRadius: "14px" }} />
        <span className="ad-skel" style={{ height: "28px", width: "70%", marginTop: "18px" }} />
        <span className="ad-skel" style={{ height: "16px", width: "90%", marginTop: "12px" }} />
        <span className="ad-skel" style={{ height: "16px", width: "80%", marginTop: "8px" }} />
      </aside>

      <div className="xp-book-panel">
        <span className="ad-skel" style={{ height: "18px", width: "40%" }} />
        <span className="ad-skel" style={{ height: "260px", marginTop: "16px", borderRadius: "14px" }} />
        <span className="ad-skel" style={{ height: "18px", width: "35%", marginTop: "24px" }} />
        <span className="ad-skel" style={{ height: "48px", marginTop: "12px", borderRadius: "999px" }} />
      </div>
    </div>
  );
}
