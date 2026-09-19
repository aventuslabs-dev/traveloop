import type { Locale } from "@/i18n/config";

/**
 * Chinese labels for the registration dropdowns.
 *
 * These translate only what the traveller *reads*. The value submitted, stored
 * and passed to Tokio Marine stays the English string from `lib/registration.ts`
 * — the insurer's records must not depend on which language the buyer used, and
 * the server's allow-list validation checks against those English values.
 *
 * Anything missing here falls back to the English label.
 */

export const nationalityLabelsCn: Record<string, string> = {
  Afghan: "阿富汗",
  Albanian: "阿尔巴尼亚",
  Algerian: "阿尔及利亚",
  American: "美国",
  Argentine: "阿根廷",
  Australian: "澳大利亚",
  Austrian: "奥地利",
  Bangladeshi: "孟加拉国",
  Belgian: "比利时",
  Brazilian: "巴西",
  British: "英国",
  Bulgarian: "保加利亚",
  Canadian: "加拿大",
  Chinese: "中国",
  Colombian: "哥伦比亚",
  Croatian: "克罗地亚",
  Czech: "捷克",
  Danish: "丹麦",
  Dutch: "荷兰",
  Egyptian: "埃及",
  Finnish: "芬兰",
  French: "法国",
  German: "德国",
  Greek: "希腊",
  Indian: "印度",
  Indonesian: "印度尼西亚",
  Irish: "爱尔兰",
  Italian: "意大利",
  Japanese: "日本",
  Kenyan: "肯尼亚",
  Malaysian: "马来西亚",
  Mexican: "墨西哥",
  Moroccan: "摩洛哥",
  Nepalese: "尼泊尔",
  "New Zealander": "新西兰",
  Nigerian: "尼日利亚",
  Norwegian: "挪威",
  Pakistani: "巴基斯坦",
  Philippine: "菲律宾",
  Polish: "波兰",
  Portuguese: "葡萄牙",
  Romanian: "罗马尼亚",
  Russian: "俄罗斯",
  Saudi: "沙特阿拉伯",
  Singaporean: "新加坡",
  "South African": "南非",
  "South Korean": "韩国",
  Spanish: "西班牙",
  Swedish: "瑞典",
  Swiss: "瑞士",
  Thai: "泰国",
  Turkish: "土耳其",
  Ukrainian: "乌克兰",
  Vietnamese: "越南",
  Other: "其他",
};

export const documentTypeLabelsCn: Record<string, string> = {
  Passport: "护照",
  "National ID": "身份证",
  "Residence Permit": "居留证",
  Other: "其他",
};

export const relationshipLabelsCn: Record<string, string> = {
  Parent: "父母",
  Sibling: "兄弟姐妹",
  "Spouse/Partner": "配偶／伴侣",
  Friend: "朋友",
  Colleague: "同事",
  Other: "其他",
};

/**
 * What to *show* for one of those stored English values.
 *
 * Shared by the checkout form and the customer portal so a nationality reads
 * the same in both. Falls back to the stored value, which is already English
 * prose — a missing translation shows the real answer rather than a blank.
 */
export function optionLabel(
  value: string,
  labels: Record<string, string>,
  lang: Locale
): string {
  return lang === "cn" ? (labels[value] ?? value) : value;
}
