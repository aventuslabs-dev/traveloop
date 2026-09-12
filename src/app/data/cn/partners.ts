import type { PartnerCategory } from "../partners";

/**
 * Chinese for the partner directory.
 *
 * Keyed by the *English phrase* rather than by partner, because the offers
 * repeat: thirty-one partners share about twenty distinct deals. Translating
 * each phrase once means a new partner reusing an existing offer is already
 * translated, and the same wording can never drift between two cards.
 *
 * Anything missing from these maps falls back to the English string, so adding
 * a partner never breaks the Chinese page — it just shows one untranslated
 * line until someone adds the phrase here.
 *
 * Partner *names* are deliberately absent: they are brands, and brands are not
 * translated.
 */

export const categoriesCn: Record<PartnerCategory, string> = {
  Dining: "餐饮",
  Shopping: "购物",
  Experiences: "体验",
  Wellness: "养生",
};

export const locationsCn: Record<string, string> = {
  Penang: "槟城",
  "Kuala Lumpur": "吉隆坡",
  Selangor: "雪兰莪",
};

/**
 * Percentages are written the Chinese way: a "9折" is nine tenths of the
 * price, i.e. 10% off. Writing "10% 折扣" would read as a 90% discount to
 * many readers.
 */
export const dealsCn: Record<string, string> = {
  "10% off": "9折优惠",
  "10% off dine-in": "堂食9折",
  "10% off total dine-in": "堂食全单9折",
  "10% off total dining": "餐饮全单9折",
  "10% off total bill": "全单9折",
  "10% off storewide": "全场9折",
  "20% off dine-in": "堂食8折",
  "Extra 5% off branded sunglasses": "品牌太阳镜额外95折",
  "MYR 1 off": "立减 MYR 1",
  "MYR 2 off": "立减 MYR 2",
  "MYR 5 off": "立减 MYR 5",
  "MYR 4 off admission": "门票立减 MYR 4",
  "MYR 5 off admission": "门票立减 MYR 5",
  "MYR 5 rebate per person": "每人回扣 MYR 5",
  "Buy 5 boxes, get 1 free": "买五盒送一盒",
  "Free beverage with any main dish": "点任意主菜赠饮品一杯",
  "Free soda with any main course": "点任意主菜赠汽水一杯",
  "Free hot latte": "赠热拿铁一杯",
  "Free rojak": "赠 Rojak 一份",
  "Free facial": "赠面部护理一次",
  "1 hour free court rental": "免费场地租用一小时",
  "Insurance coverage": "享保险保障",
};

export const termsCn: Record<string, string> = {
  "Valid until 31 Dec 2026.": "有效期至 2026 年 12 月 31 日。",
  "Valid on total dining bill.": "适用于餐饮全单。",
  "Valid on all regular-priced items.": "适用于所有正价商品。",
  "Valid for both adult and child tickets.": "成人票与儿童票均适用。",
  "Register in-store to redeem.": "需于店内登记后使用。",
  "Discount applies per admission ticket.": "优惠按每张门票计算。",
  "One complimentary non-alcoholic beverage per main dish.":
    "每份主菜赠送一杯非酒精饮品。",
  "With a minimum spend of MYR 5.": "最低消费 MYR 5。",
  "With a minimum spend of MYR 30.": "最低消费 MYR 30。",
  "Free with MYR 50 minimum dine-in spend. Valid until 31 Dec 2026.":
    "堂食满 MYR 50 即可免费获得。有效期至 2026 年 12 月 31 日。",
  "Show your passport. Valid until 31 Dec 2026.":
    "出示护照即可享用。有效期至 2026 年 12 月 31 日。",
};
