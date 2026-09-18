import about from "./about";
import blogs from "./blogs";
import bookings from "./bookings";
import checkout from "./checkout";
import common from "./common";
import contact from "./contact";
import home from "./home";
import insurance from "./insurance";
import partners from "./partners";
import passes from "./passes";
import privacy from "./privacy";
import registration from "./registration";
import terms from "./terms";

/**
 * The English dictionary, and — via `typeof` — the shape every other locale
 * must match. Add a namespace here and in `../cn/index.ts` together.
 */
const en = {
  about,
  blogs,
  bookings,
  checkout,
  common,
  contact,
  home,
  insurance,
  partners,
  passes,
  privacy,
  registration,
  terms,
};

export default en;

export type Dictionary = typeof en;
export type Namespace = keyof Dictionary;
