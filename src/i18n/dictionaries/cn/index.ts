import type { Dictionary } from "../en";
import about from "./about";
import blogs from "./blogs";
import checkout from "./checkout";
import common from "./common";
import contact from "./contact";
import home from "./home";
import partners from "./partners";
import passes from "./passes";
import privacy from "./privacy";
import registration from "./registration";
import terms from "./terms";

/** 中文词典。类型来自英文版，缺键即构建失败。 */
const cn: Dictionary = {
  about,
  blogs,
  checkout,
  common,
  contact,
  home,
  partners,
  passes,
  privacy,
  registration,
  terms,
};

export default cn;
