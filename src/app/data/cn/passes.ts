import type { PassKey } from "../passes";

/**
 * Chinese text for the passes.
 *
 * Amounts, tier keys, discounts and entitlement stay in `passes.ts`. This file
 * carries words only, and every field is optional — anything missing falls
 * back to English rather than vanishing from the page.
 *
 * Currency figures are written as "MYR 15,000" in both languages: the pass is
 * sold in ringgit and a converted number would be wrong the day after it was
 * typed.
 */

export const tierCopyCn: Record<PassKey, { name: string; tagline: string; sub: string; badge?: string }> = {
  silver: {
    name: "银卡",
    tagline: "超值之选。",
    sub: "探索更多。",
  },
  gold: {
    name: "金卡",
    tagline: "最受欢迎。",
    sub: "尽享更多。",
    badge: "最受欢迎",
  },
  platinum: {
    name: "白金卡",
    tagline: "极致体验。",
    sub: "尊享更多。",
  },
};

/** Bullet lines on the pricing cards that are not generated from prices. */
export const highlightCopyCn = {
  retail: "零售优惠最高价值 MYR 15,000",
  fnb: "餐饮优惠最高价值 MYR 3,000",
  insurance: "旅游与个人意外保险（东京海上）",
  accidentCover: "意外身故及残疾保障最高 MYR 50,000",
  photography: "90 分钟私人摄影拍摄",
  prioritySupport: "优先客服支持",
};

/** Row labels in the tier comparison table. */
export const rowCopyCn = {
  retail: "零售优惠",
  fnb: "餐饮优惠",
  insurance: "旅游与意外保险",
  photography: "私人摄影拍摄",
};

/** Cell values in the comparison table that are text rather than a price. */
export const valueCopyCn = {
  retailAmount: "最高 MYR 15,000",
  fnbAmount: "最高 MYR 3,000",
};

export const perkCopyCn: Record<
  string,
  { title: string; description: string; note?: string }
> = {
  retail: {
    title: "零售优惠",
    description:
      "在全马来西亚的合作商店与景点享受折扣，包括槟城颠倒博物馆、BMS Organics 与槟城玻璃博物馆。",
    note: "最高价值 MYR 15,000",
  },
  fnb: {
    title: "餐饮优惠",
    description:
      "于 Starbucks、Le Petit Four Pâtisserie、蜜雪冰城、Family Mart、Hero Tea、Rendez by Meowcho 等商户享专属折扣。",
    note: "最高价值 MYR 3,000",
  },
  "lion-dance": {
    title: "舞狮体验",
    description:
      "使用正统乐器与传统狮头，学习舞狮基本功。可按人数预订，或选择最多 4 人的家庭配套，每增加一人 MYR 100。场次为周二与周四晚上 8:00–10:00，以及周日下午 1:00–3:00。5 岁及以下儿童免费参加。",
  },
  batik: {
    title: "峇迪蜡染体验",
    description:
      "了解马来西亚峇迪蜡染背后的历史，亲手绘制属于自己的纪念品，费用已含博物馆门票与茶点。场次为周三上午 10:00–12:00。4 岁及以下儿童免费参加。",
  },
  "indian-culture": {
    title: "印度文化体验",
    description:
      "亲手尝试 Kolam（米粉地画）艺术、上一堂传统印度烹饪课，并欣赏婆罗多舞演出。场次为周日下午 3:00–5:00。5 岁及以下儿童免费参加。",
  },
  insurance: {
    title: "旅游与意外保险",
    description:
      "由东京海上保险（马来西亚）有限公司承保的团体个人意外保险，承保在马来西亚境内、年龄介于 30 天至 75 岁的已登记参加者 —— 涵盖业余运动、50 米以内的水肺潜水及登山活动。",
    note: "意外身故及残疾保障最高 MYR 50,000 · 医疗费用 MYR 500",
  },
  photography: {
    title: "私人摄影拍摄",
    description:
      "由专业摄影师带领，于乔治市联合国教科文组织世界遗产区进行 90 分钟私人拍摄，包含 5 张精修高清照片与一段 30 秒短片。拍摄最多 7 人。场次为周六上午 8:30–10:00 与 10:00–11:30。",
    note: "免费 · 5 张精修照片 + 30 秒短片 · 请至少提前 3 天预订",
  },
};
