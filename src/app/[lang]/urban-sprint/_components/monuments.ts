/**
 * A little monument for each landmark, standing on the hero map where the
 * landmark stands: Fort Cornwallis's cannon, the gopuram of Sri Maha
 * Mariamman, the minaret of the Acheen Street Mosque with its famous hole,
 * a stilt house on the Clan Jetties, and so on.
 *
 * Plain SVG strings, because the map's markers are DOM nodes MapLibre owns,
 * not React. Every drawing is on the same 64 × 64 grid with its ground line
 * at the bottom, so they all stand at the same height on their spot. Each
 * lit face has a darker twin on its shadow side, which is all the 3D the
 * pitched map needs.
 */

const W = "#fbf6ec";
const WS = "#d9cdb6";
const R = "#e0303c";
const RS = "#9e1c26";
const G = "#ffc94d";
const GS = "#d9981c";
const D = "#0b1c38";
const WOOD = "#9a6a3a";
const WOODS = "#6b4523";
const STONE = "#d3c4a5";
const STONES = "#a8977a";
const TEAL = "#22a386";
const TEALS = "#157460";
const SLATE = "#4b5873";
const SLATEH = "#95a2bd";
const METAL = "#4e596e";
const METALH = "#a3aec2";

const svg = (body: string) =>
  `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;

/** An arched opening: a door or window with a round top. */
const arch = (x: number, y: number, w: number, h: number, fill = D) =>
  `<path d="M${x} ${y + h}v${-(h - w / 2)}a${w / 2} ${w / 2} 0 0 1 ${w} 0v${h - w / 2}z" fill="${fill}"/>`;

const rect = (x: number, y: number, w: number, h: number, fill: string, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra}/>`;

const wheel = (cx: number) =>
  `<circle cx="${cx}" cy="49" r="6" fill="${WOODS}"/><circle cx="${cx}" cy="49" r="3.8" fill="${WOOD}"/>` +
  `<circle cx="${cx}" cy="49" r="1.4" fill="${G}"/>`;

export const MONUMENTS: Record<string, string> = {
  // A cannon on its carriage, up on the fort's rampart, still smoking.
  "fort-cornwallis": svg(
    rect(4, 52, 56, 9, STONE) +
      rect(44, 52, 16, 9, STONES) +
      rect(4, 46, 9, 7, STONE) +
      rect(51, 46, 9, 7, STONES) +
      `<path d="M4 56.5h56M18 52v4.5M32 56.5v4.5M46 52v4.5" stroke="${STONES}" stroke-width="1" fill="none"/>` +
      `<path d="M17 50H43L39 40L23 42Z" fill="${WOOD}"/>` +
      `<path d="M17 50H43L42 47H18Z" fill="${WOODS}"/>` +
      wheel(22) +
      wheel(38) +
      `<g transform="rotate(-22 30 38)">` +
      `<circle cx="11" cy="38" r="2.6" fill="${METAL}"/>` +
      `<path d="M13 38a5.5 5.5 0 0 1 5.5-5.5L54 34v8L18.5 43.5A5.5 5.5 0 0 1 13 38z" fill="${METAL}"/>` +
      `<path d="M18.5 33.3L54 34.6v1.8L18.5 35.6z" fill="${METALH}"/>` +
      rect(53, 32.6, 6, 10.8, METAL, ' rx="1.6"') +
      rect(53, 32.6, 6, 2, METALH, ' rx="1"') +
      rect(25, 32.4, 2.6, 11.2, G) +
      rect(41, 33.2, 2.2, 9.6, G) +
      `</g>` +
      `<circle cx="60" cy="21" r="3" fill="#e6ecf5" opacity=".65"/>` +
      `<circle cx="57.5" cy="15.5" r="2" fill="#e6ecf5" opacity=".45"/>`,
  ),

  // White colonial hall: central pavilion and pediment, corner turrets, flag.
  "town-hall": svg(
    rect(4, 55, 56, 5, WS) +
      rect(6, 34, 52, 22, W) +
      `<path d="M4 34h56l-4-6H8z" fill="${SLATEH}"/>` +
      rect(6, 34, 52, 2, WS) +
      [9, 15, 45, 51].map((x) => arch(x, 39, 4, 6) + arch(x, 48, 4, 6)).join("") +
      rect(7, 26, 6, 8, W) +
      `<path d="M7 26a3 3 0 0 1 6 0z" fill="${SLATEH}"/>` +
      rect(51, 26, 6, 8, WS) +
      `<path d="M51 26a3 3 0 0 1 6 0z" fill="${SLATEH}"/>` +
      rect(22, 24, 20, 32, W) +
      rect(23.5, 28, 17, 20, "#c4b79d") +
      [24, 28.5, 33, 37.5].map((x) => rect(x, 28, 2.5, 20, W)).join("") +
      `<path d="M20 25h24L32 15z" fill="${W}"/>` +
      `<path d="M23 24.5h18L32 18z" fill="${WS}"/>` +
      rect(20, 24, 24, 2, WS) +
      arch(29, 48, 6, 8) +
      rect(31.5, 5, 1, 11, G) +
      `<path d="M32.5 5h7l-2 2.5 2 2.5h-7z" fill="${R}"/>`,
  ),

  // Greek-temple portico under a tall white spire.
  "st-georges": svg(
    rect(6, 58, 52, 3, WS) +
      rect(8, 55, 48, 3, W) +
      rect(27, 14, 10, 20, W) +
      rect(32, 14, 5, 20, WS) +
      `<path d="M26 15h12L32 1z" fill="${W}"/>` +
      `<path d="M32 1l6 14h-6z" fill="${WS}"/>` +
      rect(29.5, 20, 5, 7, D, ' rx="2.5"') +
      rect(9, 30, 46, 25, "#c9bda4") +
      rect(29.5, 42, 5, 13, D) +
      [10, 18, 26, 35, 43, 51].map((x) => rect(x, 34, 3, 21, W) + rect(x + 2, 34, 1, 21, WS)).join("") +
      rect(6, 31, 52, 3, W) +
      `<path d="M6 32h52L32 20z" fill="${W}"/>` +
      `<path d="M11 30.5h42L32 23z" fill="${WS}"/>`,
  ),

  // Red-roofed temple with upturned eaves, and incense smoke from the burner.
  "kuan-yin": svg(
    rect(6, 54, 52, 6, STONE) +
      rect(6, 54, 52, 1.5, STONES) +
      rect(12, 36, 40, 18, "#f1e2c4") +
      [13, 22, 39, 48].map((x) => rect(x, 37, 3, 17, R)).join("") +
      rect(27, 41, 10, 13, D) +
      `<rect x="27" y="41" width="10" height="13" fill="none" stroke="${G}" stroke-width="1"/>` +
      `<circle cx="18.5" cy="41" r="2" fill="${R}"/><circle cx="45.5" cy="41" r="2" fill="${R}"/>` +
      rect(18, 43, 1, 2, G) +
      rect(45, 43, 1, 2, G) +
      `<path d="M3 34Q13 34 17 25H47Q51 34 61 34L57 38H7Z" fill="${R}"/>` +
      `<path d="M7 38H57L55 36H9Z" fill="${RS}"/>` +
      `<path d="M3 34L1 28.5L7 33Z" fill="${R}"/><path d="M61 34L63 28.5L57 33Z" fill="${R}"/>` +
      rect(16, 22, 32, 3.5, RS, ' rx="1"') +
      `<path d="M16 22q-4-1-3-5q2 2 5 3z" fill="${G}"/><path d="M48 22q4-1 3-5q-2 2-5 3z" fill="${G}"/>` +
      `<circle cx="32" cy="19" r="2.6" fill="${G}"/>` +
      `<path d="M4 47h9l-1.5 5h-6z" fill="${METAL}"/>` +
      rect(3.5, 46, 10, 1.5, METALH) +
      rect(5.5, 52, 1.2, 2, METAL) +
      rect(10.3, 52, 1.2, 2, METAL) +
      `<path d="M8.5 45c-3-4 3-6 0-10s3-6 0-10" stroke="#dfe6f2" stroke-width="1.6" fill="none" opacity=".7" stroke-linecap="round"/>` +
      `<path d="M10.5 44c2-3-2-5 0-8s-2-5 0-8" stroke="#dfe6f2" stroke-width="1" fill="none" opacity=".5" stroke-linecap="round"/>`,
  ),

  // The gopuram: a stepped tower of painted tiers crowned with gold finials.
  "sri-mariamman": svg(
    rect(4, 50, 56, 10, W) +
      rect(44, 52, 16, 8, WS) +
      rect(4, 50, 56, 2, G) +
      rect(18, 44, 28, 16, W) +
      rect(40, 44, 6, 16, WS) +
      arch(28, 49, 8, 11) +
      `<path d="M18 44H46L44 37H20Z" fill="${G}"/>` +
      `<path d="M20 37H44L42 31H22Z" fill="${TEAL}"/>` +
      `<path d="M22 31H42L40 25.5H24Z" fill="${R}"/>` +
      `<path d="M24 25.5H40L38 20H26Z" fill="#f59ab8"/>` +
      rect(19.5, 36.4, 25, 1.2, W) +
      rect(21.5, 30.4, 21, 1.2, W) +
      rect(23.5, 24.9, 17, 1.2, W) +
      [23, 27, 31, 35, 39, 43].map((x) => `<circle cx="${x - 1}" cy="40.8" r="1.4" fill="${R}"/>`).join("") +
      [25, 29, 33, 37, 41].map((x) => `<circle cx="${x - 1}" cy="34.2" r="1.3" fill="${G}"/>`).join("") +
      [27, 32, 37].map((x) => `<circle cx="${x}" cy="28.3" r="1.2" fill="${W}"/>`).join("") +
      [29, 32, 35].map((x) => `<circle cx="${x}" cy="22.8" r="1.1" fill="${TEAL}"/>`).join("") +
      `<path d="M25 20H39Q39 13 32 12Q25 13 25 20Z" fill="${G}"/>` +
      `<path d="M32 12Q39 13 39 20H35Q35 14 32 12Z" fill="${GS}"/>` +
      [27, 32, 37].map((x) => rect(x - 0.6, 8.5, 1.2, 5, G) + `<circle cx="${x}" cy="8.5" r="1.5" fill="${G}"/>`).join(""),
  ),

  // A great dome over arcades, corner cupolas and a minaret.
  "kapitan-keling": svg(
    rect(2, 57, 60, 3, WS) +
      rect(51, 30, 10, 27, W) +
      rect(56, 30, 5, 27, WS) +
      rect(50, 28, 12, 2.5, WS) +
      rect(53, 16, 6, 12, W) +
      rect(56, 16, 3, 12, WS) +
      rect(52, 14.5, 8, 2, WS) +
      `<path d="M53 14.5Q56 6 59 14.5Z" fill="${SLATE}"/>` +
      rect(55.5, 3.5, 1, 4, G) +
      arch(54.5, 20, 3, 5) +
      arch(54.5, 36, 3, 6) +
      rect(4, 40, 44, 17, W) +
      rect(4, 40, 44, 2, WS) +
      [8, 15, 34, 41].map((x) => arch(x, 47, 5, 9)).join("") +
      arch(22, 44, 8, 13) +
      rect(4, 35, 6, 5, W) +
      `<path d="M4 35a3 3 0 0 1 6 0z" fill="${SLATE}"/>` +
      rect(42, 35, 6, 5, WS) +
      `<path d="M42 35a3 3 0 0 1 6 0z" fill="${SLATE}"/>` +
      rect(16, 33, 20, 7, W) +
      rect(31, 33, 5, 7, WS) +
      `<path d="M14 33Q14 17 26 13Q38 17 38 33Z" fill="${SLATE}"/>` +
      `<path d="M18 31Q18 20 24 16Q21 22 21 31Z" fill="${SLATEH}" opacity=".8"/>` +
      rect(14, 32, 24, 1.6, G) +
      rect(25.4, 6.5, 1.2, 7, G) +
      `<path d="M27.8 2.2a2.8 2.8 0 1 0 0 5.2a2.2 2.2 0 1 1 0-5.2z" fill="${G}"/>`,
  ),

  // The slender minaret, with the hole in its shaft, beside a tile-roofed hall.
  "acheen-mosque": svg(
    rect(2, 57, 60, 3, WS) +
      rect(5, 44, 30, 13, W) +
      [9, 14.5, 27].map((x) => arch(x, 48, 4, 7)).join("") +
      arch(20, 47, 5, 10) +
      `<path d="M3 45H37L32 36H8Z" fill="${R}"/>` +
      rect(5, 44, 30, 1.5, RS) +
      rect(8, 35, 24, 1.5, RS) +
      `<path d="M3 45L1.5 41L6 44Z" fill="${R}"/><path d="M37 45L38.5 41L34 44Z" fill="${R}"/>` +
      rect(39, 36, 12, 21, W) +
      rect(45, 36, 6, 21, WS) +
      rect(38, 34, 14, 2.4, WS) +
      rect(40.5, 18, 9, 16, W) +
      rect(45, 18, 4.5, 16, WS) +
      `<circle cx="45" cy="26" r="1.9" fill="${D}"/>` +
      rect(39.5, 16, 11, 2, WS) +
      rect(42, 10, 6, 6, W) +
      rect(45, 10, 3, 6, WS) +
      `<path d="M41.5 10Q45 2 48.5 10Z" fill="${W}"/>` +
      `<path d="M45 4Q48 6 48.5 10H45Z" fill="${WS}"/>` +
      rect(44.5, 0.5, 1, 3.5, G) +
      arch(43, 50, 4, 7) +
      rect(44.3, 40, 1.4, 5, D) +
      rect(44.3, 11.5, 1.4, 3, D),
  ),

  // The gilded clan house up on its stone platform, green tiles, gold ridge.
  "khoo-kongsi": svg(
    rect(4, 48, 56, 12, STONE) +
      rect(4, 48, 56, 2, STONES) +
      `<path d="M4 54h18M42 54h18M13 50v4M51 50v4M9 54v6M55 54v6" stroke="${STONES}" stroke-width=".8" fill="none"/>` +
      rect(22, 57, 20, 3, WS) +
      rect(24, 54, 16, 3, STONES) +
      rect(26, 51, 12, 3, WS) +
      rect(6, 45.5, 18, 2, WS) +
      rect(40, 45.5, 18, 2, WS) +
      rect(10, 32, 44, 15, "#6e1a20") +
      [12, 19, 42.6, 49.6].map((x) => rect(x, 32, 2.4, 15, G)).join("") +
      rect(22.5, 36, 3.5, 8, GS) +
      rect(38, 36, 3.5, 8, GS) +
      rect(27, 35, 10, 12, G) +
      rect(28.5, 36.5, 7, 10.5, RS) +
      `<path d="M4 33Q13 32 16 27H48Q51 32 60 33L56 36H8Z" fill="${TEAL}"/>` +
      `<path d="M8 36H56L54.5 34H9.5Z" fill="${TEALS}"/>` +
      rect(9, 35, 46, 1, G) +
      `<path d="M4 33q-3-2-1-6q1 3 3 4z" fill="${G}"/><path d="M60 33q3-2 1-6q-1 3-3 4z" fill="${G}"/>` +
      `<path d="M13 27Q20 26 22 20H42Q44 26 51 27Z" fill="${TEAL}"/>` +
      rect(15, 26, 34, 1.2, TEALS) +
      rect(21, 17, 22, 3, G, ' rx="1"') +
      [25, 29, 35, 39].map((x) => `<path d="M${x} 17q-1.5-2 0-4q1.5 2 0 4z" fill="${G}"/>`).join("") +
      `<circle cx="32" cy="13.5" r="2.4" fill="${G}"/>` +
      `<path d="M21 17q-5 0-5-5q3 3 6 2z" fill="${G}"/><path d="M43 17q5 0 5-5q-3 3-6 2z" fill="${G}"/>`,
  ),

  // A clan house on stilts over the strait, at the end of its plank walk.
  "clan-jetties": svg(
    `<path d="M2 52Q32 48 62 52V60Q32 63 2 60Z" fill="#1f5e93"/>` +
      `<path d="M8 55.5q3-1.5 6 0t6 0M36 58q3-1.5 6 0t6 0M44 53.5q2-1 4 0" stroke="#7fb6e6" stroke-width="1.2" fill="none" stroke-linecap="round"/>` +
      [6, 14, 22, 30, 38, 46, 54].map((x) => rect(x, 44, 1.6, 12, WOODS)).join("") +
      rect(2, 42.5, 40, 3, WOOD) +
      `<path d="M7 42.5v3M12 42.5v3M17 42.5v3M22 42.5v3M27 42.5v3M32 42.5v3" stroke="${WOODS}" stroke-width=".6"/>` +
      rect(32, 43, 28, 2.5, WOOD) +
      rect(34, 30, 24, 13, "#b8452e") +
      rect(50, 30, 8, 13, "#8a3020") +
      `<path d="M31 31H61L56 22H36Z" fill="${METALH}"/>` +
      `<path d="M39 22L37 31M44 22L43.5 31M49 22L49.5 31M54 22L56 31" stroke="${METAL}" stroke-width=".7"/>` +
      rect(38, 35, 5, 8, D) +
      rect(45, 34, 4, 4, G) +
      `<circle cx="35.5" cy="33.5" r="1.8" fill="${R}"/>`,
  ),
};
