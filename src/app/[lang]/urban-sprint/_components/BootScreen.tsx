"use client";

import { useEffect, useRef, useState } from "react";
import { CHECKPOINTS } from "./course";
import { LockupLarge } from "./ui";

/**
 * The loading screen: the campaign lockup and one progress bar. When
 * everything is in, it fades out by itself onto the landing page.
 *
 * The bar is honest. Each step is something the entrance really waits on
 * (GameEntrance.tsx reports them): the map library and style, the first
 * tiles of the island, the landmark photos, the fonts, and a short floor so
 * the screen never just flickers past. Between steps the bar creeps, but it
 * never reaches a step before that step is done.
 */

export const BOOT_STEPS = [
  { id: "map", label: "Charting Penang island" },
  { id: "tiles", label: "Rendering George Town" },
  { id: "landmarks", label: `Raising ${CHECKPOINTS.length} landmarks` },
  { id: "fonts", label: "Loading fonts" },
  { id: "clock", label: "Syncing the race clock" },
] as const;

export type BootStep = (typeof BOOT_STEPS)[number]["id"];

/** How long the fade out takes; the screen leaves the tree after it. */
const LEAVE_MS = 450;

export default function BootScreen({
  done,
  onDone,
}: {
  done: readonly BootStep[];
  /** Called once the bar has filled: the page behind is ready to use. */
  onDone: () => void;
}) {
  const fill = useRef<HTMLElement>(null);
  const percent = useRef<HTMLSpanElement>(null);
  const onDoneRef = useRef(onDone);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const count = BOOT_STEPS.filter((s) => done.includes(s.id)).length;

  // The bar eases toward the steps done, creeping into the next one.
  const target = useRef(0);
  useEffect(() => {
    target.current = count / BOOT_STEPS.length;
  }, [count]);

  useEffect(() => {
    let frame = 0;
    let shown = 0;
    let creep = 0;
    let reached = 0;
    let label = "";
    const step = 1 / BOOT_STEPS.length;
    const tick = () => {
      // A finished step restarts the creep from its own mark; the creep
      // stops short of the next mark, so the bar only moves forward.
      if (target.current !== reached) {
        reached = target.current;
        creep = 0;
      }
      creep = Math.min(creep + 0.002, step * 0.8);
      const goal = reached >= 1 ? 1 : reached + creep;
      shown += (goal - shown) * 0.12;
      if (goal === 1 && 1 - shown < 0.002) shown = 1;
      fill.current?.style.setProperty("--boot", shown.toFixed(4));
      const text = `${Math.round(shown * 100)}%`;
      if (text !== label && percent.current) {
        label = text;
        percent.current.textContent = text;
      }
      if (shown === 1) {
        // Full: stop the loop and hand over.
        setLeaving(true);
        onDoneRef.current();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Out of the tree once the fade has played.
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setGone(true), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (gone) return null;

  return (
    <div
      className={`us-boot${leaving ? " is-leaving" : ""}`}
      role="progressbar"
      aria-label="Loading Urban Sprint"
      aria-valuemin={0}
      aria-valuemax={BOOT_STEPS.length}
      aria-valuenow={count}
    >
      <div className="us-boot-inner">
        <p className="us-boot-lockup">
          <span className="us-visually-hidden">Urban Sprint by Traveloop</span>
          <LockupLarge />
        </p>

        <div className="us-boot-bar" aria-hidden>
          <i ref={fill} />
        </div>
        <span className="us-boot-pct" ref={percent} aria-hidden>
          0%
        </span>
      </div>
    </div>
  );
}
