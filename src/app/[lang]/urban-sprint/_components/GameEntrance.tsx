"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { GeoJSONSource, LngLatBoundsLike, Map as MapLibreMap, PaddingOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import BootScreen, { BOOT_STEPS, type BootStep } from "./BootScreen";
import { formatRinggit, TEAM_PRICE_CENTS, TEAM_SIZE_MAX, TEAM_SIZE_MIN } from "@/lib/urban-sprint/booking-config";
import { CHECKPOINTS, CHECKPOINTS_TO_CROSS, COURSE_BOUNDS, SIDE_MISSIONS } from "./course";
import {
  FIELD,
  FIELD_BOUNDS,
  FIELD_GRID,
  FIELD_KM2,
  FIELD_WALL,
  STATIONS,
  STATION_KINDS,
  fieldPath,
  fieldScan,
  svgIcon,
} from "./field";
import { MAP_STYLE } from "./map-style";
import { MONUMENTS } from "./monuments";
import { LockupLarge } from "./ui";

/**
 * The way into Urban Sprint: loading into a game, then falling out of the sky
 * onto George Town.
 *
 *   boot      BootScreen.tsx — the loader, until the map is really ready
 *   sky       a dusk sky over Penang, clouds, and URBAN SPRINT
 *   01        the mission: don't just see George Town, play it
 *   (dive)    down through the clouds; the island comes up underneath
 *   02        the game field: the camera drops onto George Town and a red
 *             hologram maps out the heritage core (field.ts): the boundary
 *             draws itself, walls rise, a grid lights and a scanner sweeps it
 *   03        loading game stations: the landmarks drop onto the field,
 *             then partner stations pop up round them, kind by kind (food,
 *             cafés, retail, photo missions), counted off in a legend
 *   play      the board is live: tour, clue card, sign up
 *
 * The section is several screens tall with a stage pinned inside it, and
 * scroll position is the timeline: everything from the clouds to the camera
 * is a pure function of how far through the section the visitor is, so
 * scrolling back up plays it backwards. The visitor doesn't scrub that
 * timeline by hand, though: each flick plays a whole level (KNOTS) by driving
 * the scroll itself, and stops at the next. Per-frame work writes CSS variables
 * and styles straight to the DOM; React re-renders only when the phase
 * changes (descent ↔ play) or the board itself changes.
 *
 * The map is one MapLibre instance throughout, and it never takes gestures:
 * on the way down its camera follows the scroll; at the bottom a tour flies
 * landmark to landmark, and a landmark, arrow or number hands the visitor
 * the controls.
 */

/* ------------------------------------------------------------ timeline */

/** Where each beat lands, as a fraction of the scroll through the section. */
const BEAT = {
  /** Clouds part and rush past, sky fades out under a warm white-out. */
  cloudsFrom: 0.12,
  cloudsTo: 0.4,
  skyFrom: 0.3,
  skyTo: 0.4,
  washAt: 0.33,
  /** The hologram: boundary traced, walls up, grid on, scanner across. */
  lineFrom: 0.41,
  lineTo: 0.49,
  wallFrom: 0.46,
  wallTo: 0.53,
  gridFrom: 0.49,
  gridTo: 0.54,
  scanFrom: 0.5,
  scanTo: 0.555,
  /** Landmarks land; then the stations. */
  pinsFrom: 0.61,
  pinsTo: 0.69,
  stationsFrom: 0.7,
  stationsTo: 0.82,
  /** From here down the board is live. */
  play: 0.88,
};

/** [in, out] for each chapter's text. The first is up from the start. */
const CHAPTERS: [number, number][] = [
  [-1, 0.1],
  [0.12, 0.27],
  [0.39, 0.6],
  [0.61, 0.87],
];

/**
 * The entrance plays in levels. One flick of the wheel, a swipe or an arrow
 * key plays the next level through on its own clock and it stops, fully
 * played, at the next named knot. `ms` is how long the stretch from the knot
 * before takes to play; the unnamed knots only set the pace inside a level.
 */
const KNOTS: { p: number; ms: number; stop?: string }[] = [
  { p: 0, ms: 0, stop: "Title" },
  { p: 0.2, ms: 1800, stop: "Mission" },
  // Down through the clouds...
  { p: 0.4, ms: 2300 },
  // ...and the hologram maps the field.
  { p: 0.56, ms: 3300, stop: "Game field" },
  { p: 0.61, ms: 500 },
  // Landmarks drop, then the stations pop up.
  { p: 0.826, ms: 3700, stop: "Stations" },
  // The board goes live at BEAT.play; the rest of the section is only the
  // stage unpinning, so it goes by quickly. The last stop is the section's
  // very end: from the board, the next scroll moves the page on.
  { p: 0.88, ms: 1100 },
  { p: 1, ms: 350, stop: "Play" },
];
const TAUS = KNOTS.reduce<number[]>((acc, k, i) => [...acc, i ? acc[i - 1] + k.ms : 0], []);
const STOPS = KNOTS.filter((k) => k.stop).map((k) => k.p);
const LAST_STOP = STOPS[STOPS.length - 1];

/** The rail: every level but the title. */
const STEPS = KNOTS.filter((k) => k.stop && k.p > 0).map((k) => ({ name: k.stop!, at: k.p }));

/** Scroll progress → milliseconds into the show, and back. */
const tauAt = (p: number) => {
  const i = Math.max(1, KNOTS.findIndex((k) => k.p >= clamp01(p)));
  const t = clamp01((p - KNOTS[i - 1].p) / (KNOTS[i].p - KNOTS[i - 1].p));
  return lerp(TAUS[i - 1], TAUS[i], t);
};
const pAtTau = (tau: number) => {
  const i = Math.max(1, TAUS.findIndex((t) => t >= Math.min(tau, TAUS[TAUS.length - 1])));
  const t = clamp01((tau - TAUS[i - 1]) / (TAUS[i] - TAUS[i - 1] || 1));
  return lerp(KNOTS[i - 1].p, KNOTS[i].p, t);
};
/** Levels play back up faster than down: going back is a rewind. */
const REWIND = 0.5;
/** From the board down to the next section, and back. */
const EXIT_MS = 900;
/** Wheel events closer together than this are one gesture. */
const GESTURE_GAP_MS = 250;
const easeGlide = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

const pinAt = (i: number) => BEAT.pinsFrom + ((BEAT.pinsTo - BEAT.pinsFrom) * i) / (CHECKPOINTS.length - 1);
const stationAt = (i: number) =>
  BEAT.stationsFrom + ((BEAT.stationsTo - BEAT.stationsFrom) * i) / (STATIONS.length - 1);

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ramp = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pad2 = (n: number) => String(n).padStart(2, "0");

/* ---------------------------------------------------------------- camera */

type Cam = { p: number; center: [number, number]; zoom: number; pitch: number; bearing: number };

/**
 * cameraForBounds hands back a centre already shifted for the padding it was
 * given, so every camera built from one is applied with no padding of its
 * own; padding it again would shift the view twice.
 */
const NO_PADDING: PaddingOptions = { top: 0, bottom: 0, left: 0, right: 0 };

/** Penang island, for the view out of the clouds. */
const ISLAND: LngLatBoundsLike = [
  [100.17, 5.25],
  [100.35, 5.49],
];
/** Keeps the visitor from wandering off to the mainland or out to sea. */
const MAX_BOUNDS: LngLatBoundsLike = [
  [100.05, 5.15],
  [100.6, 5.6],
];
const COURSE_CENTER: [number, number] = [
  (COURSE_BOUNDS[0][0] + COURSE_BOUNDS[1][0]) / 2,
  (COURSE_BOUNDS[0][1] + COURSE_BOUNDS[1][1]) / 2,
];

const toPair = (c: unknown, fallback: [number, number]): [number, number] => {
  const ll = c as { lng: number; lat: number } | undefined;
  return ll ? [ll.lng, ll.lat] : fallback;
};

/**
 * The fall, as camera keyframes: the island out of the clouds, George Town
 * coming up, then the game field framed beside the chapter text, the camera
 * turning slowly round it while the hologram builds and the stations load,
 * and last the same field framed for the board, so play starts exactly where
 * the scroll left off. Between keys the camera eases.
 */
function descentKeys(map: MapLibreMap, descent: PaddingOptions, boardRoom: PaddingOptions): Cam[] {
  const fit = (bounds: LngLatBoundsLike, padding: PaddingOptions, bearing: number, fallbackZoom: number) => {
    const cam = map.cameraForBounds(bounds, { padding, bearing });
    return { center: toPair(cam?.center, COURSE_CENTER), zoom: cam?.zoom ?? fallbackZoom };
  };
  // George Town coming up: the field with a few blocks of city round it.
  const [[w, s], [e, n]] = FIELD_BOUNDS;
  const town: LngLatBoundsLike = [
    [w - (e - w) * 1.2, s - (n - s) * 1.2],
    [e + (e - w) * 1.2, n + (n - s) * 1.2],
  ];
  const field = FIELD_BOUNDS as LngLatBoundsLike;
  const island = fit(ISLAND, descent, 0, 10.6);
  const city = fit(town, descent, -6, 14.4);
  const mapped = fit(field, descent, -20, 15.5);
  const scanning = fit(field, descent, -34, 15.5);
  const landed = fit(field, descent, -44, 15.5);
  const stocked = fit(field, descent, -28, 15.5);
  const board = fit(field, boardRoom, -18, 15.5);
  return [
    { p: 0.24, ...island, pitch: 0, bearing: 0 },
    { p: 0.4, ...city, pitch: 20, bearing: -6 },
    { p: 0.48, ...mapped, zoom: mapped.zoom - 0.1, pitch: 42, bearing: -20 },
    { p: 0.58, ...scanning, pitch: 50, bearing: -34 },
    { p: 0.7, ...landed, zoom: landed.zoom + 0.45, pitch: 52, bearing: -44 },
    { p: 0.82, ...stocked, zoom: stocked.zoom + 0.45, pitch: 54, bearing: -28 },
    { p: 0.88, ...board, pitch: 56, bearing: -18 },
  ];
}

function cameraAt(keys: Cam[], p: number): Omit<Cam, "p"> {
  if (p <= keys[0].p) return keys[0];
  const last = keys[keys.length - 1];
  if (p >= last.p) return last;
  let i = 1;
  while (keys[i].p < p) i++;
  const a = keys[i - 1];
  const b = keys[i];
  const t = ease(ramp(p, a.p, b.p));
  return {
    center: [lerp(a.center[0], b.center[0], t), lerp(a.center[1], b.center[1], t)],
    zoom: lerp(a.zoom, b.zoom, t),
    pitch: lerp(a.pitch, b.pitch, t),
    bearing: lerp(a.bearing, b.bearing, t),
  };
}

/**
 * Room the chapter text takes on the way down (and, from a tablet up, the
 * step rail on the right), so the landmarks land where they can be
 * seen. The board's own overlays aren't up yet, so this is not their room.
 */
function descentPadding(stage: HTMLElement | null, chapter: HTMLElement | null): PaddingOptions {
  const s = stage?.getBoundingClientRect();
  const c = chapter?.getBoundingClientRect();
  if (!s || !c) return { top: 100, bottom: 60, left: 40, right: 40 };
  if (s.width >= 1024) {
    return { top: 110, bottom: 70, left: c.right - s.left + 30, right: 230 };
  }
  return { top: Math.max(120, c.bottom - s.top + 16), bottom: 80, left: 24, right: 24 };
}

/** Room the board's overlays take, so the camera centres the course in what's left. */
function overlayPadding(
  stage: HTMLElement | null,
  copy: HTMLElement | null,
  card: HTMLElement | null,
): PaddingOptions {
  const s = stage?.getBoundingClientRect();
  const c = copy?.getBoundingClientRect();
  const k = card?.getBoundingClientRect();
  if (!s || !c || !k) return { top: 80, bottom: 40, left: 40, right: 40 };
  if (s.width >= 1024) {
    // Right of the headline and above the card.
    return { top: 140, bottom: s.bottom - k.top + 20, left: c.right - s.left + 20, right: 40 };
  }
  return {
    top: Math.max(80, c.bottom - s.top + 10),
    bottom: Math.max(40, s.bottom - k.top + 10),
    left: 24,
    right: 24,
  };
}

/* ------------------------------------------------------------------ tour */

const FLIGHT_MS = 3200;
const DWELL_MS = 4800;
/** How long the whole-course view holds before the tour's first flight. */
const OVERVIEW_HOLD_MS = 3000;

/** A different angle at every landmark, all within 60° of north so nobody loses the sea. */
const bearingAt = (i: number) => ((i * 67) % 120) - 60;

const line = (coordinates: [number, number][]) => ({
  type: "Feature" as const,
  properties: {},
  geometry: { type: "LineString" as const, coordinates },
});

/* ------------------------------------------------------------------ sky */

/**
 * The cloud field. x/y/w place each cloud (as % of the stage); depth is how
 * hard it rushes past on the way down, and dir which way it parts. Back
 * clouds sit behind the title, front clouds in front of it.
 */
const CLOUDS = [
  { src: "cloud-d", x: -18, y: 58, w: 82, depth: 0.7, dir: -1, front: false },
  { src: "cloud-a", x: 44, y: 52, w: 74, depth: 0.8, dir: 1, front: false },
  { src: "cloud-c", x: 8, y: 14, w: 34, depth: 0.45, dir: -1, front: false },
  { src: "cloud-e", x: 66, y: 10, w: 30, depth: 0.5, dir: 1, front: false },
  { src: "cloud-b", x: -12, y: 80, w: 64, depth: 1.25, dir: -1, front: true },
  { src: "cloud-a", x: 54, y: 78, w: 70, depth: 1.35, dir: 1, front: true },
  { src: "cloud-e", x: 28, y: 90, w: 46, depth: 1.6, dir: 1, front: true },
];

const CLOUD_SIZES: Record<string, [number, number]> = {
  "cloud-a": [1400, 520],
  "cloud-b": [1100, 420],
  "cloud-c": [900, 360],
  "cloud-d": [1600, 560],
  "cloud-e": [800, 320],
};

function Clouds({ front }: { front: boolean }) {
  return (
    <>
      {CLOUDS.filter((c) => c.front === front).map((c, i) => (
        <span
          key={`${c.src}-${i}`}
          className="us-cloud"
          style={
            {
              "--x": `${c.x}%`,
              "--y": `${c.y}%`,
              "--w": `${c.w}%`,
              "--depth": c.depth,
              "--dir": c.dir,
              "--drift": `${14 + i * 3}s`,
            } as CSSProperties
          }
        >
          <Image
            src={`/urban-sprint/sky/${c.src}.webp`}
            alt=""
            width={CLOUD_SIZES[c.src][0]}
            height={CLOUD_SIZES[c.src][1]}
            // A phone draws each cloud 2.1× wider (see .us-cloud), so it
            // asks for the matching width rather than the desktop one.
            sizes={`(max-width: 639px) ${Math.round(c.w * 2.1)}vw, ${c.w}vw`}
            loading="eager"
          />
        </span>
      ))}
    </>
  );
}

/* ------------------------------------------------------------- helpers */

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

const BOOTED_KEY = "us-booted";
const noSubscribe = () => () => {};

/**
 * Whether to skip the loader: already played through this session, or the
 * visitor came for a section further down (#leaderboard) and shouldn't be
 * held at a start screen to get there. False on the server, so the loader is
 * in the HTML for everyone else.
 */
function readSkipBoot(): boolean {
  try {
    if (window.location.hash) return true;
    return window.sessionStorage.getItem(BOOTED_KEY) === "1";
  } catch {
    return false;
  }
}

/* ============================================================ component */

export default function GameEntrance({
  raceMinutes,
  signUpHref,
}: {
  raceMinutes: number;
  signUpHref: string;
}) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  const chapters = useRef<(HTMLElement | null)[]>([]);
  const steps = useRef<(HTMLLIElement | null)[]>([]);
  const kindRows = useRef<(HTMLLIElement | null)[]>([]);
  const kindCounts = useRef<(HTMLElement | null)[]>([]);
  const hint = useRef<HTMLDivElement>(null);

  const mapRef = useRef<MapLibreMap | null>(null);
  const pins = useRef<HTMLElement[]>([]);
  const stations = useRef<HTMLElement[]>([]);
  const fieldTag = useRef<HTMLElement | null>(null);
  const keys = useRef<Cam[] | null>(null);
  const progress = useRef(0);
  const phaseRef = useRef<"descent" | "play">("descent");
  const activeRef = useRef<number | null>(null);
  const loadedRef = useRef(-1);
  const stockedRef = useRef(-1);
  const fieldLineRef = useRef(-1);
  const scanRef = useRef(-1);
  /** Last value written per layer paint property, so a frame only sends changes. */
  const painted = useRef<Record<string, number>>({});
  const stageMonuments = useRef<() => void>(() => {});
  const paintRef = useRef<(p: number) => void>(() => {});
  /** Plays the timeline to a point (see the levels effect); set once in the game. */
  const glideRef = useRef<(p: number, maxMs?: number) => void>(() => {});

  const [bootDone, setBootDone] = useState<BootStep[]>([]);
  const [entered, setEntered] = useState(false);
  // Entering writes the flag readSkipBoot looks for, so once entered it no
  // longer means "skip": the loader stays mounted to play its fade.
  const skipBoot = useSyncExternalStore(noSubscribe, readSkipBoot, () => false) && !entered;
  const inGame = entered || skipBoot;

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<"descent" | "play">("descent");
  const [visible, setVisible] = useState(true);
  const [playing, setPlaying] = useState(true);
  /** null is the whole-course view; a number is the landmark the camera is on. */
  const [active, setActive] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const live = phase === "play" && visible;
  const touring = playing && !reduced && live;

  const markBoot = useCallback((step: BootStep) => {
    setBootDone((done) => (done.includes(step) ? done : [...done, step]));
  }, []);

  /* ------------------------------------------------------------- boot */
  useEffect(() => {
    document.fonts?.ready.then(() => markBoot("fonts"));
    const floor = window.setTimeout(() => markBoot("clock"), 700);
    // Nothing holds the visitor at the gate for long: after this, whatever
    // hasn't loaded loads behind the sky.
    const ceiling = window.setTimeout(() => BOOT_STEPS.forEach((s) => markBoot(s.id)), 5000);

    const photos = CHECKPOINTS.slice(0, 4).map(
      (cp) =>
        new Promise<void>((resolve) => {
          const img = new window.Image();
          img.onload = img.onerror = () => resolve();
          img.src = cp.photo;
        }),
    );
    Promise.all(photos).then(() => markBoot("landmarks"));

    return () => {
      window.clearTimeout(floor);
      window.clearTimeout(ceiling);
    };
  }, [markBoot]);

  const enter = useCallback(() => {
    setEntered(true);
    try {
      window.sessionStorage.setItem(BOOTED_KEY, "1");
    } catch {
      // Private mode: the loader simply shows again next time.
    }
  }, []);

  // Held at the top while the loader is up; it enters by itself once full.
  useEffect(() => {
    // Re-read, not just inGame: on the first pass after hydration inGame is
    // still the server's false, and a #leaderboard visitor must not be
    // yanked back to the top.
    if (inGame || readSkipBoot()) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      root.style.overflow = before;
    };
  }, [inGame]);

  /* ------------------------------------------------------------ the map */
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;

    (async () => {
      try {
        const { Map, Marker } = await import("maplibre-gl");
        if (cancelled || !canvas.current) return;

        map = new Map({
          container: canvas.current,
          style: MAP_STYLE,
          bounds: ISLAND,
          maxBounds: MAX_BOUNDS,
          maxPitch: 70,
          minZoom: 9,
          // A picture to watch, not a map to drive: no drag, zoom, rotate or
          // Ctrl+scroll, so a wheel or swipe over it always scrolls the page.
          // The landmarks, arrows and numbers steer the camera instead.
          interactive: false,
          attributionControl: { compact: true },
        });
        mapRef.current = map;

        // The map credits (OpenFreeMap, OpenMapTiles, OpenStreetMap) have to
        // stay on the map, but they needn't be spelled out: MapLibre folds
        // them into the ⓘ button on the visitor's first drag, and this map
        // has no drag, so fold them once it has drawn. A tap on ⓘ shows them.
        map.once("idle", () => {
          canvas.current
            ?.querySelector(".maplibregl-ctrl-attrib.maplibregl-compact-show")
            ?.classList.remove("maplibregl-compact-show");
        });

        pins.current = CHECKPOINTS.map((cp, i) => {
          const el = document.createElement("button");
          el.type = "button";
          el.className = "us-pin";
          el.style.setProperty("--i", String(i));
          el.setAttribute("aria-label", `Checkpoint ${i + 1}: ${cp.name}`);
          el.innerHTML =
            `<span class="us-pin-name">${cp.name}</span>` +
            `<span class="us-mon"><span class="us-pin-base"></span>` +
            `<span class="us-mon-art">${MONUMENTS[cp.id]}</span>` +
            `<span class="us-mon-num">${pad2(i + 1)}</span></span>`;
          el.addEventListener("click", (event) => {
            event.stopPropagation();
            setPlaying(false);
            setActive(i);
          });
          new Marker({ element: el, anchor: "bottom" }).setLngLat(cp.at).addTo(map!);
          return el;
        });

        // Monuments shrink as the camera pulls back, so the course doesn't
        // become a pile of buildings, and the nearer one stands in front.
        // Ranks, not pixels, for the stacking: 1–11, under the overlays.
        const placeMonuments = () => {
          if (!map) return;
          const scale = Math.min(1.05, Math.max(0.6, 0.74 + (map.getZoom() - 15) * 0.18));
          map.getContainer().style.setProperty("--mon-scale", scale.toFixed(3));
          CHECKPOINTS.map((cp, i) => ({ i, y: map!.project(cp.at).y }))
            .sort((a, b) => a.y - b.y)
            .forEach(({ i }, rank) => {
              pins.current[i].style.zIndex = String(i === activeRef.current ? 11 : rank + 1);
            });
        };
        stageMonuments.current = placeMonuments;
        map.on("move", placeMonuments);

        // The stations: small pins in their kind's colour, set dressing
        // for the legend, so hidden from assistive tech and never clickable.
        stations.current = STATIONS.map((station, i) => {
          const kind = STATION_KINDS.find((k) => k.id === station.kind)!;
          const el = document.createElement("span");
          el.className = "us-stn";
          el.setAttribute("aria-hidden", "true");
          el.style.setProperty("--kind", kind.color);
          el.style.setProperty("--j", String(i));
          el.innerHTML = `<span class="us-stn-pin">${svgIcon(kind.icon)}</span>`;
          new Marker({ element: el, anchor: "bottom" }).setLngLat(station.at).addTo(map!);
          return el;
        });

        // The hologram's tag, floating over the field's northern edge.
        // (MapLibre owns a marker element's opacity, so the tag that fades
        // in and out is a child of it.)
        const anchor = document.createElement("span");
        anchor.setAttribute("aria-hidden", "true");
        const tag = document.createElement("span");
        tag.className = "us-fieldtag";
        tag.innerHTML = `<b>Game field</b><span>${FIELD_KM2.toFixed(1)} km² · heritage core</span>`;
        anchor.append(tag);
        new Marker({ element: anchor, anchor: "bottom" }).setLngLat(FIELD[1]).addTo(map);
        fieldTag.current = tag;

        map.once("idle", () => markBoot("tiles"));
        map.on("load", () => {
          if (!map) return;
          markBoot("map");
          map.addSource("field-area", {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [FIELD] } },
          });
          map.addSource("field-wall", {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: FIELD_WALL } },
          });
          map.addSource("field-grid", {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: FIELD_GRID } },
          });
          map.addSource("field-line", { type: "geojson", data: line([FIELD[0], FIELD[0]]) });
          map.addSource("field-scan", {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: [] } },
          });
          map.addSource("flags", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: CHECKPOINTS.map((cp) => ({
                type: "Feature",
                properties: { id: cp.id },
                geometry: { type: "Point", coordinates: cp.at },
              })),
            },
          });
          const before = "street-names";

          // The hologram, in the race's red: a tint over the field, a grid,
          // translucent walls round it, the glowing boundary and the scanner.
          // Everything starts invisible; the scroll timeline brings it up.
          const RED = "#ff3b4b";
          map.addLayer(
            { id: "field-fill", type: "fill", source: "field-area", paint: { "fill-color": RED, "fill-opacity": 0 } },
            before,
          );
          map.addLayer(
            {
              id: "field-grid",
              type: "line",
              source: "field-grid",
              paint: { "line-color": "#ff6b76", "line-width": 1, "line-opacity": 0 },
            },
            before,
          );
          map.addLayer(
            {
              id: "field-wall",
              type: "fill-extrusion",
              source: "field-wall",
              paint: {
                "fill-extrusion-color": RED,
                "fill-extrusion-height": 0,
                "fill-extrusion-opacity": 0,
              },
            },
            before,
          );
          map.addLayer(
            {
              id: "field-glow",
              type: "line",
              source: "field-line",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: {
                "line-color": RED,
                "line-opacity": 0.55,
                "line-blur": 8,
                "line-width": ["interpolate", ["linear"], ["zoom"], 13, 8, 17, 26],
              },
            },
            before,
          );
          map.addLayer(
            {
              id: "field-line",
              type: "line",
              source: "field-line",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: {
                "line-color": "#ff8a93",
                "line-width": ["interpolate", ["linear"], ["zoom"], 13, 1.5, 17, 3.5],
              },
            },
            before,
          );
          map.addLayer(
            {
              id: "field-scan-glow",
              type: "line",
              source: "field-scan",
              paint: { "line-color": RED, "line-width": 22, "line-blur": 14, "line-opacity": 0 },
            },
            before,
          );
          map.addLayer(
            {
              id: "field-scan",
              type: "line",
              source: "field-scan",
              paint: { "line-color": "#ffd0d4", "line-width": 2, "line-opacity": 0 },
            },
            before,
          );

          map.addLayer(
            {
              id: "flag-glow",
              type: "circle",
              source: "flags",
              filter: ["in", ["get", "id"], ["literal", []]],
              paint: {
                "circle-color": "#ffc94d",
                "circle-opacity": 0.28,
                "circle-blur": 0.9,
                "circle-pitch-alignment": "map",
                "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 12, 5, 16, 30, 18, 110],
              },
            },
            before,
          );
          map.addLayer(
            {
              id: "flag-active",
              type: "circle",
              source: "flags",
              filter: ["==", ["get", "id"], ""],
              paint: {
                "circle-color": "#e8323f",
                "circle-opacity": 0.4,
                "circle-blur": 0.7,
                "circle-pitch-alignment": "map",
                "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 12, 8, 16, 46, 18, 170],
              },
            },
            before,
          );
          keys.current = descentKeys(
            map,
            descentPadding(stage.current, chapters.current[3]),
            overlayPadding(stage.current, copy.current, card.current),
          );
          loadedRef.current = -1;
          stockedRef.current = -1;
          fieldLineRef.current = -1;
          scanRef.current = -1;
          painted.current = {};
          setReady(true);
          paintRef.current(progress.current);
        });
      } catch (error) {
        // No WebGL, or the library didn't load: the sky, chapters and card
        // still play; the loader stops waiting for the map.
        console.error("[us-entrance] Map unavailable:", error);
        if (!cancelled) {
          setFailed(true);
          markBoot("map");
          markBoot("tiles");
        }
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, [markBoot]);

  /* ------------------------------------------------ the scroll timeline */
  useEffect(() => {
    const paint = (p: number) => {
      const el = stage.current;
      if (!el) return;

      // Sky and clouds, as CSS variables the stylesheet turns into motion.
      el.style.setProperty("--fly", ramp(p, BEAT.cloudsFrom, BEAT.cloudsTo).toFixed(4));
      el.style.setProperty("--sky", (1 - ramp(p, BEAT.skyFrom, BEAT.skyTo)).toFixed(4));
      el.style.setProperty("--wash", clamp01(1 - Math.abs(p - BEAT.washAt) / 0.085).toFixed(4));
      // Past the white-out the sky, clouds and wash are all at zero: take the
      // layers out, so their drift animations stop costing frames.
      el.classList.toggle("is-past-sky", p > BEAT.washAt + 0.09);

      // Chapters fade and slide through; the step rail follows the one showing.
      chapters.current.forEach((chapter, i) => {
        if (!chapter) return;
        const [a, b] = CHAPTERS[i];
        const o = Math.min(ramp(p, a, a + 0.035), 1 - ramp(p, b - 0.035, b));
        const leavingUp = p > (a + b) / 2;
        chapter.style.opacity = o.toFixed(3);
        chapter.style.transform = `translate3d(0, ${((1 - o) * (leavingUp ? -28 : 28)).toFixed(1)}px, 0)`;
        chapter.style.visibility = o < 0.01 ? "hidden" : "visible";
      });
      const rail = p >= BEAT.play ? 3 : CHAPTERS.slice(1).filter(([a]) => p >= a).length - 1;
      steps.current.forEach((step, i) => {
        step?.classList.toggle("is-active", i === rail);
        step?.classList.toggle("is-done", i < rail);
      });

      const map = mapRef.current;
      const k = keys.current;
      const cam = k ? cameraAt(k, p) : null;

      const onBoard = p >= BEAT.play;
      const loaded = onBoard ? CHECKPOINTS.length : CHECKPOINTS.filter((_, i) => p >= pinAt(i)).length;
      const stocked = onBoard ? STATIONS.length : STATIONS.filter((_, i) => p >= stationAt(i)).length;

      if (loaded !== loadedRef.current) {
        loadedRef.current = loaded;
        pins.current.forEach((pin, i) => pin.classList.toggle("is-in", i < loaded));
        if (map && map.getLayer("flag-glow")) {
          map.setFilter("flag-glow", [
            "in",
            ["get", "id"],
            ["literal", CHECKPOINTS.slice(0, loaded).map((cp) => cp.id)],
          ]);
        }
      }
      if (stocked !== stockedRef.current) {
        stockedRef.current = stocked;
        stations.current.forEach((el, i) => el.classList.toggle("is-in", i < stocked));
      }

      // The legend: each kind counts up as its stations land, lit while
      // loading, ticked when full.
      const counts = [loaded, ...STATION_KINDS.map((kind) => STATIONS.slice(0, stocked).filter((st) => st.kind === kind.id).length)];
      const totals = [CHECKPOINTS.length, ...STATION_KINDS.map((kind) => kind.count)];
      counts.forEach((n, i) => {
        const row = kindRows.current[i];
        const count = kindCounts.current[i];
        const text = `${n}/${totals[i]}`;
        if (count && count.textContent !== text) count.textContent = text;
        row?.classList.toggle("is-loading", n > 0 && n < totals[i]);
        row?.classList.toggle("is-done", n >= totals[i]);
      });

      // The hologram. The boundary traces itself, the walls rise, the grid
      // lights, a scanner sweeps north to south; on the board it all steps
      // back so the landmarks lead.
      if (map && map.getLayer("field-line")) {
        const set = (layer: string, prop: string, value: number) => {
          const key = `${layer}.${prop}`;
          if (Math.abs((painted.current[key] ?? -1) - value) < 0.002) return;
          painted.current[key] = value;
          map.setPaintProperty(layer, prop, value);
        };
        const traced = Math.round(ramp(p, BEAT.lineFrom, BEAT.lineTo) * 300) / 300;
        if (traced !== fieldLineRef.current) {
          fieldLineRef.current = traced;
          (map.getSource("field-line") as GeoJSONSource).setData(
            line(traced > 0 ? fieldPath.upTo(traced) : [FIELD[0], FIELD[0]]),
          );
        }
        const wall = ease(ramp(p, BEAT.wallFrom, BEAT.wallTo));
        // On the board the walls come down and the rest dims: the landmarks
        // lead, and the boundary is just a line on the ground.
        set("field-wall", "fill-extrusion-height", onBoard ? 0 : 55 * wall);
        set("field-wall", "fill-extrusion-opacity", onBoard ? 0 : 0.34 * wall);
        set("field-fill", "fill-opacity", (onBoard ? 0.04 : 0.1) * ramp(p, BEAT.lineTo - 0.02, BEAT.wallTo));
        set("field-grid", "line-opacity", onBoard ? 0 : 0.4 * ramp(p, BEAT.gridFrom, BEAT.gridTo));
        set("field-line", "line-opacity", onBoard ? 0.55 : 1);
        set("field-glow", "line-opacity", onBoard ? 0.25 : 0.55);

        const sweep = ramp(p, BEAT.scanFrom, BEAT.scanTo);
        const beam = sweep > 0 && sweep < 1 ? Math.sin(sweep * Math.PI) : 0;
        set("field-scan", "line-opacity", beam);
        set("field-scan-glow", "line-opacity", beam * 0.8);
        const at = Math.round(sweep * 400) / 400;
        if (beam > 0 && at !== scanRef.current) {
          scanRef.current = at;
          (map.getSource("field-scan") as GeoJSONSource).setData({
            type: "Feature",
            properties: {},
            geometry: { type: "MultiLineString", coordinates: fieldScan(at) },
          });
        }
      }
      fieldTag.current?.classList.toggle("is-on", p >= BEAT.wallTo - 0.01 && !onBoard);

      // Until the board is onBoard, a nudge to keep scrolling.
      hint.current?.classList.toggle("is-on", p > 0.02 && !onBoard);

      // Down the timeline the camera follows the scroll; at the bottom the
      // board takes over (see the camera effect below).
      const next = onBoard ? "play" : "descent";
      if (next !== phaseRef.current) {
        phaseRef.current = next;
        setPhase(next);
        if (next === "descent") {
          map?.stop();
          setActive(null);
        }
      }
      if (map && cam && next === "descent") {
        map.jumpTo({ ...cam, padding: NO_PADDING });
      }
    };
    paintRef.current = paint;

    let frame = 0;
    // Below the section (the board, the footer) progress sits at 1 and
    // nothing on the stage moves, so an unchanged progress skips the paint.
    let lastP = -1;
    let force = true;
    const update = () => {
      frame = 0;
      const wrap = section.current;
      if (!wrap) return;
      const box = wrap.getBoundingClientRect();
      const run = box.height - window.innerHeight;
      const p = clamp01(run > 0 ? -box.top / run : 0);
      if (p === lastP && !force) return;
      lastP = p;
      force = false;
      progress.current = p;
      paint(p);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      const map = mapRef.current;
      if (map && map.loaded()) {
        keys.current = descentKeys(
          map,
          descentPadding(stage.current, chapters.current[3]),
          overlayPadding(stage.current, copy.current, card.current),
        );
      }
      force = true;
      onScroll();
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  /* ------------------------------------------------ one level at a time */
  useEffect(() => {
    if (!inGame) return;
    const stageEl = stage.current;

    const geometry = () => {
      const wrap = section.current;
      if (!wrap) return null;
      const top = wrap.getBoundingClientRect().top + window.scrollY;
      const run = wrap.offsetHeight - window.innerHeight;
      // One more stop past the board: the next section, tucked under the bar.
      const navH = parseFloat(getComputedStyle(wrap).getPropertyValue("--us-nav-h")) || 0;
      const exit = top + wrap.offsetHeight - navH;
      return run > 0 ? { top, run, first: top, last: top + run * LAST_STOP, exit } : null;
    };
    const progressNow = (g: { top: number; run: number }) => (window.scrollY - g.top) / g.run;
    const jump = (y: number) => window.scrollTo({ top: y, behavior: "instant" });

    /** The next level's stop from p, heading dir; null past either end. */
    const stopFrom = (p: number, dir: number, run: number) => {
      const slack = 2 / run;
      const next = dir > 0 ? STOPS.find((s) => s > p + slack) : STOPS.findLast((s) => s < p - slack);
      return next ?? null;
    };

    /** The glide playing: where the scroll is k (0 → 1, eased) of the way through. */
    let glide: { at: (k: number) => number; dir: number; t: number; total: number } | null = null;
    let raf = 0;
    let lastFrame = 0;

    // Wheel and trackpad. One gesture (a burst of events, momentum and all)
    // plays at most one level, and a gesture still going when a level ends
    // stays spent: the next level wants a fresh flick.
    let lastWheel = performance.now();
    let spent = true;
    let pushed = 0;

    const tick = (now: number) => {
      if (!glide) return;
      glide.t = Math.min(glide.total, glide.t + (now - lastFrame));
      lastFrame = now;
      jump(glide.at(glide.total ? easeGlide(glide.t / glide.total) : 1));
      if (glide.t < glide.total) {
        raf = requestAnimationFrame(tick);
      } else {
        glide = null;
        stageEl?.classList.remove("is-gliding");
        spent = true;
        lastWheel = now;
      }
    };

    const glideTo = (to: number, maxMs = Infinity) => {
      const g = geometry();
      if (!g) return;
      const from = clamp01(progressNow(g));
      if (Math.abs(to - from) * g.run < 1) return;
      const fromTau = tauAt(from);
      const toTau = tauAt(to);
      const back = toTau < fromTau;
      play({
        at: (k) => g.top + g.run * pAtTau(lerp(fromTau, toTau, k)),
        dir: back ? -1 : 1,
        total: Math.min(maxMs, Math.abs(toTau - fromTau) * (back ? REWIND : 1)),
      });
    };
    glideRef.current = glideTo;

    /** Between the board and the page below: a plain eased scroll. */
    const glidePx = (to: number) => {
      const from = window.scrollY;
      if (Math.abs(to - from) < 1) return;
      play({ at: (k) => lerp(from, to, k), dir: Math.sign(to - from), total: EXIT_MS });
    };

    const play = (next: { at: (k: number) => number; dir: number; total: number }) => {
      glide = { ...next, t: 0, total: reduced ? 0 : next.total };
      stageEl?.classList.add("is-gliding");
      cancelAnimationFrame(raf);
      lastFrame = performance.now();
      raf = requestAnimationFrame(tick);
    };

    /**
     * A flick plays the next level. Mid-level, one the same way waits for the
     * level to finish (it always plays out); one the other way turns round.
     */
    const flick = (dir: number) => {
      const g = geometry();
      if (!g || (glide && dir === glide.dir)) return;
      // From the board one flick carries on down to the next section; from
      // there (or on the way), one flick up comes back to the board.
      const y = window.scrollY;
      if (dir > 0 && y >= g.last - 1) return glidePx(g.exit);
      if (dir < 0 && y > g.last + 1) return glidePx(g.last);
      const to = stopFrom(progressNow(g), dir, g.run);
      if (to !== null) glideTo(to);
    };

    /**
     * Where the visitor is relative to the levels: "in" them, or outside
     * (above the first, below the exit) where the page scrolls as normal.
     * At either end, heading out, the page takes over again.
     */
    const zone = (dir: number) => {
      const g = geometry();
      if (!g) return "out";
      const y = window.scrollY;
      if (y < g.first - 1 || y > g.exit + 1) return "out";
      if (!glide && ((dir > 0 && y >= g.exit - 1) || (dir < 0 && y <= g.first + 1))) return "out";
      return "in";
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pinch or browser zoom
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      if (!dy) return;
      const now = performance.now();
      if (now - lastWheel > GESTURE_GAP_MS) {
        spent = false;
        pushed = 0;
      }
      lastWheel = now;
      const g = geometry();
      if (!g) return;

      // Coming back from the page below (or above), stop at the edge of the
      // levels rather than sliding into the middle of one.
      const y = window.scrollY;
      if ((y > g.exit + 1 && y + dy < g.exit) || (y < g.first - 1 && y + dy > g.first)) {
        e.preventDefault();
        jump(y > g.exit ? g.exit : g.first);
        spent = true;
        return;
      }
      const dir = Math.sign(dy);
      if (zone(dir) === "out" && !spent) return;
      if (y < g.first - 1 || y > g.exit + 1) return;
      e.preventDefault();
      if (spent) return;
      pushed += dy;
      if (Math.abs(pushed) < 12) return;
      spent = true;
      flick(dir);
    };

    // Touch: a swipe past a few pixels plays a level.
    let touch: { x: number; y: number; mode: "page" | "levels" | null; spent: boolean } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touch = e.touches.length === 1 ? { x: t.clientX, y: t.clientY, mode: null, spent: false } : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touch || e.touches.length !== 1) return;
      const dx = touch.x - e.touches[0].clientX;
      const dy = touch.y - e.touches[0].clientY;
      const dir = Math.sign(dy) || 1;
      // Decided on the first move, since after that the browser won't let
      // go. Sideways swipes (the landmark numbers) stay the page's.
      touch.mode ??= Math.abs(dx) <= Math.abs(dy) && zone(dir) === "in" ? "levels" : "page";
      if (touch.mode === "page") return;
      if (e.cancelable) e.preventDefault();
      if (touch.spent || Math.abs(dy) < 28) return;
      touch.spent = true;
      flick(dir);
    };
    const onTouchEnd = () => {
      touch = null;
      settleSoon();
    };

    // Keys: the ones that scroll a page.
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === " " && target?.closest("button, a, summary")) return;
      const dir =
        e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)
          ? 1
          : e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey)
            ? -1
            : 0;
      if (!dir || zone(dir) === "out") return;
      e.preventDefault();
      if (e.repeat && glide) return;
      flick(dir);
    };

    // Anything else that moves the page (the scrollbar, find-in-page, a
    // reload halfway down) and leaves it between levels: finish the level
    // in the direction it was going.
    let settleTimer = 0;
    let lastY = window.scrollY;
    let heading = 1;
    const settle = () => {
      const g = geometry();
      if (glide || touch || !g) return;
      const y = window.scrollY;
      if (y > g.last + 2 && y < g.exit - 2) return glidePx(heading > 0 ? g.exit : g.last);
      const p = progressNow(g);
      if (p <= 0 || p >= LAST_STOP) return;
      if (STOPS.some((s) => Math.abs(s - p) * g.run < 2)) return;
      const to = stopFrom(p, heading, g.run) ?? stopFrom(p, -heading, g.run);
      if (to !== null) glideTo(to);
    };
    const settleSoon = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, 180);
    };
    const onScroll = () => {
      const y = window.scrollY;
      if (y !== lastY) heading = Math.sign(y - lastY);
      lastY = y;
      if (!glide) settleSoon();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    settleSoon();
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(settleTimer);
      cancelAnimationFrame(raf);
      stageEl?.classList.remove("is-gliding");
      glideRef.current = () => {};
    };
  }, [inGame, reduced]);

  /* ------------------------------------------ pause everything offscreen */
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.15,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* ----------------------------------------------------- board camera */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    activeRef.current = active;
    pins.current.forEach((el, i) => el.classList.toggle("is-active", i === active));
    stageMonuments.current();
    map.setFilter("flag-active", ["==", ["get", "id"], active === null ? "" : CHECKPOINTS[active].id]);
    if (phase !== "play") return;

    const room = overlayPadding(stage.current, copy.current, card.current);
    if (active === null) {
      const course = keys.current?.[keys.current.length - 1];
      if (course) {
        map.flyTo({ ...course, padding: NO_PADDING, duration: 1200 });
      }
    } else {
      map.flyTo({
        center: CHECKPOINTS[active].at,
        zoom: 17.4,
        pitch: 64,
        bearing: bearingAt(active),
        padding: room,
        duration: FLIGHT_MS,
        curve: 1.3,
      });
    }
  }, [active, ready, phase]);

  /* -------------------------------------------------------------- tour */
  useEffect(() => {
    if (!touring) return;
    const wait = active === null ? OVERVIEW_HOLD_MS : FLIGHT_MS + DWELL_MS;
    const timer = window.setTimeout(
      () => setActive((a) => (a === null ? 0 : (a + 1) % CHECKPOINTS.length)),
      wait,
    );
    return () => window.clearTimeout(timer);
  }, [active, touring]);

  const stepBy = (by: number) => {
    setPlaying(false);
    setActive((a) => {
      const from = a ?? (by > 0 ? -1 : 0);
      return (from + by + CHECKPOINTS.length) % CHECKPOINTS.length;
    });
  };


  const cp = active === null ? null : CHECKPOINTS[active];
  const isPlay = phase === "play";

  return (
    <section ref={section} className="us-entrance" aria-labelledby="us-entrance-title">
      {!skipBoot && <BootScreen done={bootDone} onDone={enter} />}

      <div
        ref={stage}
        className={`us-stage${isPlay ? " is-play" : ""}${ready ? " is-ready" : ""}${failed ? " is-failed" : ""}${inGame ? " is-entered" : ""}${visible ? "" : " is-offscreen"}`}
      >
        <div
          className="us-map"
          ref={canvas}
          role="region"
          aria-label="3D map of the Urban Sprint course in George Town, Penang"
        />
        <div className="us-map-shade" aria-hidden />

        {/* ------------------------------------------------------- sky */}
        <div className="us-sky" aria-hidden>
          <div className="us-sky-sun" />
          <Clouds front={false} />
        </div>
        <div className="us-sky-front" aria-hidden>
          <Clouds front />
          <div className="us-sky-wash" />
        </div>

        {/* The chapter rail doubles as a way to jump about the story. */}
        <nav className="us-steps" aria-label="Entrance chapters">
          <ol>
            {STEPS.map((step, i) => (
              <li
                key={step.name}
                ref={(el) => {
                  steps.current[i] = el;
                }}
              >
                <button type="button" onClick={() => glideRef.current(step.at, 3000)} tabIndex={inGame ? undefined : -1}>
                  <b>{pad2(i + 1)}</b>
                  <span>{step.name}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* -------------------------------------------------- chapters */}
        <div
          className="us-chapter is-title"
          ref={(el) => {
            chapters.current[0] = el;
          }}
        >
          <p className="us-hero-kicker">George Town · Penang</p>
          <h1 id="us-entrance-title" className="us-title">
            <span className="us-visually-hidden">Urban Sprint by Traveloop</span>
            <LockupLarge />
          </h1>
          <p className="us-title-sub">A live team race through Penang&apos;s heritage city.</p>
          <div className="us-scrollcue">
            <span className="us-scrollcue-mouse" aria-hidden />
            Scroll to descend
          </div>
        </div>

        <div
          className="us-chapter is-center"
          ref={(el) => {
            chapters.current[1] = el;
          }}
        >
          <p className="us-chapter-num">01 · Your mission</p>
          <h2>
            Don&apos;t just see George Town. <em>Play it.</em>
          </h2>
          <p className="us-chapter-lede">
            You and your crew get {raceMinutes} minutes to race the streets of George Town and score
            as many points as you can. When the clock stops, the most points wins.
          </p>
        </div>

        <div
          className="us-chapter"
          ref={(el) => {
            chapters.current[2] = el;
          }}
        >
          <p className="us-chapter-num">02 · The game field</p>
          <h2>
            Your game field: <em>George Town.</em>
          </h2>
          <p className="us-chapter-lede">
            Asia&apos;s street-food capital and a living museum of temples, clan houses and murals,
            all inside one red line. For {raceMinutes} minutes, every street of it is yours.
          </p>
          <ul className="us-facts">
            <li>
              <b>UNESCO</b>
              <span>World Heritage Site</span>
            </li>
            <li>
              <b>200+ years</b>
              <span>of living history</span>
            </li>
            <li>
              <b>{CHECKPOINTS.length}</b>
              <span>iconic landmarks</span>
            </li>
          </ul>
        </div>

        <div
          className="us-chapter is-loading"
          ref={(el) => {
            chapters.current[3] = el;
          }}
        >
          <p className="us-chapter-num">03 · Loading game stations</p>
          <h2>
            Every stop is <em>points on the board.</em>
          </h2>
          <p className="us-chapter-lede">
            Hawker stalls, heritage cafés, local makers and street-art walls are all in the game. Clear
            a station and it scores. Draw a booster at the start line and one category scores extra,
            so plan your route around it.
          </p>
          <ul className="us-kinds" aria-label="What's on the field">
            <li
              ref={(el) => {
                kindRows.current[0] = el;
              }}
              style={{ "--kind": "#ffc94d" } as CSSProperties}
            >
              <i className="us-kind-icon is-landmark" dangerouslySetInnerHTML={{ __html: MONUMENTS["town-hall"] }} />
              <span className="us-kind-text">
                <b>Landmarks</b>
                <small>Cross any {CHECKPOINTS_TO_CROSS}</small>
              </span>
              <em
                ref={(el) => {
                  kindCounts.current[0] = el;
                }}
              >
                0/{CHECKPOINTS.length}
              </em>
            </li>
            {STATION_KINDS.map((kind, i) => (
              <li
                key={kind.id}
                ref={(el) => {
                  kindRows.current[i + 1] = el;
                }}
                style={{ "--kind": kind.color } as CSSProperties}
              >
                <i className="us-kind-icon" dangerouslySetInnerHTML={{ __html: svgIcon(kind.icon) }} />
                <span className="us-kind-text">
                  <b>{kind.label}</b>
                  <small>{kind.note}</small>
                </span>
                <em
                  ref={(el) => {
                    kindCounts.current[i + 1] = el;
                  }}
                >
                  0/{kind.count}
                </em>
              </li>
            ))}
          </ul>
          <p className="us-kinds-note">
            A preview of the field. Your real mission board is handed out at the briefing.
          </p>
        </div>

        {!isPlay && inGame && (
          <button type="button" className="us-skip" onClick={() => glideRef.current(LAST_STOP, 2200)}>
            Skip to the game board
          </button>
        )}

        <div className="us-hint" ref={hint} aria-hidden>
          <span className="us-hint-chev" />
          Scroll for the next level
        </div>

        {/* ----------------------------------------------------- board */}
        <div className="us-hero-copy" ref={copy} aria-hidden={!isPlay}>
          <p className="us-hero-kicker">
            Game board loaded
          </p>
          <h2 className="us-board-title">
            The board is set. <em>Are you ready?</em>
          </h2>
          <p className="us-hero-lede">
            Score big, climb the live leaderboard and see where your crew ranks against every team
            that&apos;s raced. Every racer also takes home a Traveloop Platinum Pass, with deals worth
            up to MYR 18,000 across Malaysia.
          </p>
          <ul className="us-hero-stats">
            <li>
              <b>{raceMinutes}</b>
              <span>minutes</span>
            </li>
            <li>
              <b>{SIDE_MISSIONS}</b>
              <span>missions</span>
            </li>
            <li>
              <b>
                {TEAM_SIZE_MIN}–{TEAM_SIZE_MAX}
              </b>
              <span>per team</span>
            </li>
            <li>
              <b>{formatRinggit(TEAM_PRICE_CENTS)}</b>
              <span>per team</span>
            </li>
          </ul>
          <div className="us-hero-ctas">
            <Link
              className="us-btn us-btn-primary us-btn-xl us-hero-btn"
              href={signUpHref}
              tabIndex={isPlay ? undefined : -1}
            >
              Book your team&apos;s race
              <span className="us-chevrons" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            </Link>
            <a className="us-hero-link" href="#leaderboard" tabIndex={isPlay ? undefined : -1}>
              See who you&apos;re racing
            </a>
          </div>
        </div>

        <article className="us-cp" ref={card} aria-hidden={!isPlay} aria-live={touring ? "off" : "polite"}>
          {/* Keyed by stop, so every new target plays the lock-on again: the
              reticle closes in, a scan line sweeps the photo, the badge lands. */}
          <div className="us-cp-media" key={cp?.id ?? "course"}>
            {cp ? (
              <div className="us-cp-photo">
                <Image src={cp.photo} alt={`${cp.name}, George Town`} fill sizes="(min-width: 1024px) 380px, 112px" />
              </div>
            ) : (
              <div className="us-cp-photo is-course" aria-hidden>
                {CHECKPOINTS.slice(0, 4).map((c) => (
                  <Image key={c.id} src={c.photo} alt="" width={180} height={120} sizes="(min-width: 1024px) 190px, 56px" />
                ))}
              </div>
            )}
            <span className="us-cp-reticle" aria-hidden />
            <span className="us-cp-scan" aria-hidden />
            {cp && (
              <span className="us-cp-type" aria-hidden>
                {/* The same monument that stands on this spot on the map. */}
                <i className="us-cp-badge" dangerouslySetInnerHTML={{ __html: MONUMENTS[cp.id] }} />
                <span>Landmark</span>
              </span>
            )}
          </div>

          {/* The next stop's photo, fetched while this one is showing, so the
              card never lands on an empty frame. Same `sizes`, same file. */}
          <div className="us-cp-next" aria-hidden>
            <Image
              src={CHECKPOINTS[((active ?? -1) + 1) % CHECKPOINTS.length].photo}
              alt=""
              fill
              loading="eager"
              sizes="(min-width: 1024px) 380px, 112px"
            />
          </div>

          <div className="us-cp-body">
            <p className="us-cp-tag">
              <span className="us-cp-dot" aria-hidden />
              {active === null ? (
                "The course"
              ) : (
                <>
                  Checkpoint <b>{pad2(active + 1)}</b>
                  <span className="us-cp-of">/ {pad2(CHECKPOINTS.length)}</span>
                </>
              )}
            </p>
            <h3 className="us-cp-name">
              {cp ? cp.name : `${CHECKPOINTS.length} landmarks. Cross any ${CHECKPOINTS_TO_CROSS}.`}
            </h3>
            <p className="us-cp-blurb">
              {cp ? cp.blurb : "Plan your route, pick your missions, beat the clock. Tap a landmark to scout it."}
            </p>
          </div>

          <div className="us-cp-ctrl">
            <button
              type="button"
              className="us-cp-btn"
              onClick={() => stepBy(-1)}
              aria-label="Previous checkpoint"
              tabIndex={isPlay ? undefined : -1}
            >
              ‹
            </button>
            <button
              type="button"
              className="us-cp-btn is-play"
              onClick={() => setPlaying((p) => !p)}
              aria-label={touring ? "Pause the tour" : "Play the tour"}
              aria-pressed={touring}
              disabled={reduced}
              tabIndex={isPlay ? undefined : -1}
            >
              {touring ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button
              type="button"
              className="us-cp-btn"
              onClick={() => stepBy(1)}
              aria-label="Next checkpoint"
              tabIndex={isPlay ? undefined : -1}
            >
              ›
            </button>
            {/* A segmented progress bar: stops already toured are filled, and
                while the tour plays, the current one fills in time with it. */}
            <ol
              className={`us-cp-rail${touring && cp ? " is-touring" : ""}`}
              aria-label="Checkpoints"
              style={{ "--cp-dwell": `${FLIGHT_MS + DWELL_MS}ms` } as CSSProperties}
            >
              {CHECKPOINTS.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={i === active ? "is-active" : active !== null && i < active ? "is-done" : undefined}
                    aria-label={`${i + 1}: ${c.name}`}
                    aria-current={i === active ? "step" : undefined}
                    title={c.name}
                    tabIndex={isPlay ? undefined : -1}
                    onClick={() => {
                      setPlaying(false);
                      setActive(i);
                    }}
                  />
                </li>
              ))}
            </ol>
          </div>
        </article>
      </div>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor" />
    </svg>
  );
}
