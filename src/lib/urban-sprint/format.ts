/**
 * Display helpers. Scores are fractional by design (30 + 25% = 37.5), so the
 * rule everywhere is: show the decimal only when there is one — "37.5", but
 * "30", never "30.0".
 */

export function points(value: number): string {
  // String(37.5) is "37.5" and String(30) is "30" — exactly the rule above,
  // with none of the trailing zeros toFixed(2) would add.
  return String(Math.round((value + Number.EPSILON) * 100) / 100);
}

export function signedPoints(value: number): string {
  return `${value >= 0 ? "+" : ""}${points(value)}`;
}

export function percent(value: number): string {
  return `${points(value)}%`;
}

export function ordinal(rank: number): string {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rank}th`;
  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 90) return "1 min ago";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dayTime(iso: string): string {
  return new Date(iso).toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** URL-safe key derived from a display name, used for team/category slugs. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    // NFKD splits "é" into "e" plus a combining accent; drop the accent so
    // "Cafés" becomes "cafes", not "cafe-s".
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Initials for the avatar chips — "Ravi Kumar" becomes "RK". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Completion time: 3725 -> "1:02:05", 1805 -> "30:05". */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${ss}` : `${minutes}:${ss}`;
}

/**
 * Reads a completion time as staff type it off a stopwatch: "58:12",
 * "1:02:05", or plain minutes ("75"). Null for anything else, including zero —
 * a team can't finish in no time, and a typo shouldn't rank first on ties.
 */
export function parseDuration(input: string): number | null {
  const value = input.trim();

  if (/^\d{1,3}$/.test(value)) {
    const minutes = Number(value);
    return minutes > 0 ? minutes * 60 : null;
  }

  const match = value.match(/^(?:(\d{1,2}):)?(\d{1,3}):(\d{2})$/);
  if (!match) return null;

  const [, h, m, s] = match;
  const minutes = Number(m);
  const seconds = Number(s);
  if (seconds > 59 || (h !== undefined && minutes > 59)) return null;

  const total = Number(h ?? 0) * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}
