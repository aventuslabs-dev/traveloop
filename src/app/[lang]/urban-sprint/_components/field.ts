import { CHECKPOINTS } from "./course";

/**
 * The game field and the stations on it, for the entrance's hologram.
 *
 * FIELD traces George Town's heritage core, from the Esplanade and the fort
 * down Weld Quay past the Clan Jetties and back up the inland streets: every
 * landmark on the course is inside it. It is drawn for the map, not
 * surveyed; the copy calls it the game field, never the legal boundary.
 *
 * The stations are a preview. Real partner stations have no coordinates in
 * the database, and a team's mission board is handed out at the briefing,
 * so the map places a representative spread of them, the same every visit
 * (seeded), and the page says so.
 */

type LngLat = [number, number];

/** Clockwise from the north-west corner, closed. */
export const FIELD: LngLat[] = [
  [100.3352, 5.4212],
  [100.3398, 5.4232],
  [100.3452, 5.4226],
  [100.3466, 5.4196],
  [100.3437, 5.4158],
  [100.3418, 5.4112],
  [100.338, 5.4108],
  [100.3345, 5.4128],
  [100.3332, 5.417],
  [100.3352, 5.4212],
];

/* ---------------------------------------------------------- measuring */

const LAT = 5.417;
const M_PER_LNG = 111_320 * Math.cos((LAT * Math.PI) / 180);
const M_PER_LAT = 110_540;

/** Walks a path by distance, so anything drawn along it moves at an even pace. */
export function measure(path: LngLat[]) {
  const legs = [0];
  for (let i = 1; i < path.length; i++) {
    const dx = (path[i][0] - path[i - 1][0]) * M_PER_LNG;
    const dy = (path[i][1] - path[i - 1][1]) * M_PER_LAT;
    legs.push(legs[i - 1] + Math.hypot(dx, dy));
  }
  const total = legs[legs.length - 1];

  const at = (t: number): LngLat => {
    const d = Math.min(1, Math.max(0, t)) * total;
    let i = 1;
    while (i < legs.length - 1 && legs[i] < d) i++;
    const f = (d - legs[i - 1]) / (legs[i] - legs[i - 1] || 1);
    return [
      path[i - 1][0] + (path[i][0] - path[i - 1][0]) * f,
      path[i - 1][1] + (path[i][1] - path[i - 1][1]) * f,
    ];
  };

  /** The path from its start to a fraction `t` of the way along. */
  const upTo = (t: number): LngLat[] => {
    if (t >= 1) return path;
    const d = Math.max(0, t) * total;
    const out: LngLat[] = [path[0]];
    for (let i = 1; i < path.length && legs[i] < d; i++) out.push(path[i]);
    out.push(at(t));
    return out;
  };

  return { at, upTo, total };
}

export const fieldPath = measure(FIELD);

export const FIELD_BOUNDS: [LngLat, LngLat] = FIELD.reduce<[LngLat, LngLat]>(
  ([[w, s], [e, n]], [x, y]) => [
    [Math.min(w, x), Math.min(s, y)],
    [Math.max(e, x), Math.max(n, y)],
  ],
  [
    [180, 90],
    [-180, -90],
  ],
);

/** The field's area, for the HUD. */
export const FIELD_KM2 = (() => {
  let twice = 0;
  for (let i = 1; i < FIELD.length; i++) {
    const [x0, y0] = FIELD[i - 1];
    const [x1, y1] = FIELD[i];
    twice += x0 * M_PER_LNG * (y1 * M_PER_LAT) - x1 * M_PER_LNG * (y0 * M_PER_LAT);
  }
  return Math.abs(twice) / 2 / 1_000_000;
})();

function inside([x, y]: LngLat, ring: LngLat[] = FIELD): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/**
 * Where a line of latitude (or longitude) crosses the field, as the pieces
 * inside it. Works on the dent along Weld Quay too: crossings are paired
 * off in order, inside to outside.
 */
function crossings(value: number, axis: 0 | 1): LngLat[][] {
  const other = axis === 0 ? 1 : 0;
  const hits: number[] = [];
  for (let i = 1; i < FIELD.length; i++) {
    const a = FIELD[i - 1];
    const b = FIELD[i];
    // Half-open, so a line through a corner counts it once, not twice or never.
    if (a[axis] > value !== b[axis] > value) {
      hits.push(a[other] + ((value - a[axis]) * (b[other] - a[other])) / (b[axis] - a[axis]));
    }
  }
  hits.sort((m, n) => m - n);
  const out: LngLat[][] = [];
  for (let i = 0; i + 1 < hits.length; i += 2) {
    out.push(
      axis === 1
        ? [
            [hits[i], value],
            [hits[i + 1], value],
          ]
        : [
            [value, hits[i]],
            [value, hits[i + 1]],
          ],
    );
  }
  return out;
}

/** The hologram's grid: a line every 60 m each way, cut to the field. */
export const FIELD_GRID: LngLat[][] = (() => {
  const [[w, s], [e, n]] = FIELD_BOUNDS;
  const lines: LngLat[][] = [];
  for (let lat = s + 60 / M_PER_LAT; lat < n; lat += 60 / M_PER_LAT) lines.push(...crossings(lat, 1));
  for (let lng = w + 60 / M_PER_LNG; lng < e; lng += 60 / M_PER_LNG) lines.push(...crossings(lng, 0));
  return lines;
})();

/** The scanner's beam a fraction `t` of the way down the field, north to south. */
export function fieldScan(t: number): LngLat[][] {
  const [[, s], [, n]] = FIELD_BOUNDS;
  return crossings(n - (n - s) * Math.min(0.999, Math.max(0.001, t)), 1);
}

/** The field's walls: a thin band just inside the boundary, for extruding. */
export const FIELD_WALL: LngLat[][] = (() => {
  const cx = FIELD.slice(0, -1).reduce((sum, p) => sum + p[0], 0) / (FIELD.length - 1);
  const cy = FIELD.slice(0, -1).reduce((sum, p) => sum + p[1], 0) / (FIELD.length - 1);
  const inner = FIELD.map(([x, y]): LngLat => [cx + (x - cx) * 0.988, cy + (y - cy) * 0.988]);
  return [FIELD, [...inner].reverse()];
})();

/* ------------------------------------------------------------ stations */

export type StationKind = "food" | "cafe" | "retail" | "photo";

export const STATION_KINDS: {
  id: StationKind;
  label: string;
  note: string;
  color: string;
  count: number;
  icon: string;
}[] = [
  {
    id: "food",
    label: "Food stations",
    note: "Hawker stalls and kopitiams",
    color: "#ffb43d",
    count: 10,
    icon:
      '<path d="M3.5 11h17a8.5 8 0 0 1-17 0z" fill="currentColor"/>' +
      '<path d="M8 3.5l4 6.5M16.5 3l-3.5 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  },
  {
    id: "cafe",
    label: "Café stations",
    note: "Heritage cafés and tea houses",
    color: "#35d6b4",
    count: 6,
    icon:
      '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" fill="currentColor"/>' +
      '<path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c-1 1 1 2 0 3.5M12 3.5c-1 1 1 2 0 3.5" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>',
  },
  {
    id: "retail",
    label: "Retail stations",
    note: "Craft shops and local makers",
    color: "#7aa2ff",
    count: 8,
    icon:
      '<path d="M5 8h14l-1 12H6z" fill="currentColor"/>' +
      '<path d="M9 8V6.5a3 3 0 0 1 6 0V8" stroke="currentColor" stroke-width="1.8" fill="none"/>',
  },
  {
    id: "photo",
    label: "Photo missions",
    note: "Murals, street art and views",
    color: "#ff7ab8",
    count: 6,
    icon:
      '<path d="M4 8h3.5L9 5.5h6L16.5 8H20v11H4z" fill="currentColor"/>' +
      '<circle cx="12" cy="13.5" r="3.2" fill="var(--kind)"/>',
  },
];

export const svgIcon = (body: string) =>
  `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">${body}</svg>`;

/** Seeded, so the preview is the same spread on every visit. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const metres = (a: LngLat, b: LngLat) =>
  Math.hypot((a[0] - b[0]) * M_PER_LNG, (a[1] - b[1]) * M_PER_LAT);

/**
 * The preview stations, grouped by kind in the order they load. Kept off the
 * water (sampled inside a slightly shrunken field), clear of the landmarks'
 * monuments, and apart from each other.
 */
export const STATIONS: { kind: StationKind; at: LngLat }[] = (() => {
  const random = rng(2026);
  const [[w, s], [e, n]] = FIELD_BOUNDS;
  const cx = (w + e) / 2;
  const cy = (s + n) / 2;
  const core = FIELD.map(([x, y]): LngLat => [cx + (x - cx) * 0.86, cy + (y - cy) * 0.86]);
  const placed: LngLat[] = [];
  const out: { kind: StationKind; at: LngLat }[] = [];
  for (const kind of STATION_KINDS) {
    for (let k = 0; k < kind.count; k++) {
      for (let tries = 0; tries < 400; tries++) {
        const p: LngLat = [w + (e - w) * random(), s + (n - s) * random()];
        if (!inside(p, core)) continue;
        if (CHECKPOINTS.some((cp) => metres(cp.at, p) < 55)) continue;
        if (placed.some((q) => metres(q, p) < 42)) continue;
        placed.push(p);
        out.push({ kind: kind.id, at: p });
        break;
      }
    }
  }
  return out;
})();
