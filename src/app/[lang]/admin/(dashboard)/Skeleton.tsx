/** Placeholder that mirrors the stat-row + table shape every index page uses,
 *  so the layout doesn't jump when real data arrives. */
export default function Skeleton({ stats = 4, rows = 6 }: { stats?: number; rows?: number }) {
  return (
    <>
      <div className="ad-stats" aria-hidden="true">
        {Array.from({ length: stats }, (_, i) => (
          <div className="ad-stat" key={i}>
            <span className="ad-skel" style={{ width: "45%", height: "10px" }} />
            <span className="ad-skel" style={{ width: "60%", height: "24px", marginTop: "10px" }} />
          </div>
        ))}
      </div>
      <div className="ad-panel" aria-hidden="true">
        <div className="ad-panel-body">
          {Array.from({ length: rows }, (_, i) => (
            <span
              className="ad-skel"
              key={i}
              style={{ height: "18px", marginBottom: "14px", width: `${92 - i * 6}%` }}
            />
          ))}
        </div>
      </div>
      <p className="ad-visually-hidden" role="status">
        Loading…
      </p>
    </>
  );
}
