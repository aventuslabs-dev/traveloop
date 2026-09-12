"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a server-rendered Urban Sprint page live.
 *
 * The page passes the revision it rendered with; this polls /api/urban-sprint/pulse and
 * calls router.refresh() when the server has moved past it. Because the pages
 * stay Server Components, "live" costs no duplicate client-side data layer —
 * the same queries that rendered the page re-run and React reconciles.
 *
 * Polling pauses on a hidden tab, so a gamemaster's phone in their pocket
 * isn't asking every few seconds while the screen is off.
 */
export default function LiveRefresh({
  revision,
  intervalMs = 4000,
}: {
  revision: number;
  /** Longer on the public board, which nobody is acting on second-to-second. */
  intervalMs?: number;
}) {
  const router = useRouter();
  const seen = useRef(revision);

  // Only ever move forward: a refresh in flight can hand us a prop older than
  // what the poll already saw, and rewinding would fire a redundant refresh.
  useEffect(() => {
    if (revision > seen.current) seen.current = revision;
  }, [revision]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        try {
          const response = await fetch("/api/urban-sprint/pulse", { cache: "no-store" });
          if (response.ok) {
            const { revision: latest } = (await response.json()) as { revision: number };
            if (!cancelled && latest > seen.current) {
              seen.current = latest;
              router.refresh();
            }
          }
        } catch {
          // Offline or a dropped request — the next tick retries. A race on
          // foot goes through plenty of dead spots; it must not throw.
        }
      }

      if (!cancelled) timer = setTimeout(tick, intervalMs);
    }

    timer = setTimeout(tick, intervalMs);

    // Coming back to the tab should feel instant rather than waiting out the
    // interval that elapsed while it was hidden.
    function onVisible() {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        timer = setTimeout(tick, 250);
      }
    }

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
