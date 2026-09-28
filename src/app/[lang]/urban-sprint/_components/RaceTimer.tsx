"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { RACE_SECONDS, raceEndsAt } from "@/lib/urban-sprint/race-clock";
import { formatDuration } from "@/lib/urban-sprint/format";

/**
 * One clock for every timer on the page. A board can show many teams
 * racing at once; they all read this one interval rather than each running
 * their own. It runs only while a timer is mounted, and snaps to whole
 * seconds so every reading within a second is the same value.
 */
const wholeSecond = () => Math.floor(Date.now() / 1000) * 1000;
let now = wholeSecond();
const listeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!ticker) {
    now = wholeSecond();
    ticker = setInterval(() => {
      now = wholeSecond();
      listeners.forEach((notify) => notify());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(ticker);
      ticker = undefined;
    }
  };
}

const getSnapshot = () => now;

/**
 * A running race's clock, ticking in the browser. `elapsed` counts up (the
 * boards: time so far), `remaining` counts down (the gamemaster: time left).
 *
 * When the 180 minutes run out it refreshes the page once: the server ends the
 * race on its next read (race-db.settleExpiredRaces), so the refresh is what
 * moves the team from "racing" to its final result.
 */
export default function RaceTimer({
  startedAt,
  mode = "elapsed",
}: {
  startedAt: string;
  mode?: "elapsed" | "remaining";
}) {
  const router = useRouter();
  const endsAt = raceEndsAt(startedAt);
  // The server renders with its own time; the client corrects it on its
  // first tick (hence suppressHydrationWarning below).
  const current = useSyncExternalStore(subscribe, getSnapshot, wholeSecond);

  const over = current >= endsAt;
  useEffect(() => {
    if (over) router.refresh();
  }, [over, router]);

  const elapsed = Math.min(Math.max(Math.floor((current - Date.parse(startedAt)) / 1000), 0), RACE_SECONDS);
  const seconds = mode === "elapsed" ? elapsed : RACE_SECONDS - elapsed;

  return (
    <span className="us-racetimer" suppressHydrationWarning>
      {formatDuration(seconds)}
    </span>
  );
}
