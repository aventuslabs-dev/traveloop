import type { ExperienceKey } from "../experiences";

/**
 * Chinese text for the bookable experiences.
 *
 * Only the words live here. Prices, weekdays, session times, participant
 * limits, discounts and entitlement are all left in `experiences.ts` as the
 * single source of truth — a translation must never be able to move money or
 * change who can book what.
 *
 * Every field is optional: anything omitted falls back to the English string,
 * so adding an experience upstream never breaks the Chinese site.
 */
export type ExperienceCopy = {
  name?: string;
  tagline?: string;
  description?: string;
  includes?: string[];
  durationLabel?: string;
  venue?: string;
  venueNote?: string;
  participantsLabel?: string;
  knowBeforeYouGo?: string[];
  /** Keyed by the pack / package / included-label key. */
  packLabel?: string;
  packNote?: string;
  includedLabel?: string;
};

export const experienceCopyCn: Partial<Record<ExperienceKey, ExperienceCopy>> = {
  "lion-dance": {
    name: "舞狮体验",
    tagline: "学打鼓、走步法，亲手举起狮头。",
    description:
      "与槟城舞狮团队一同上手体验：正统乐器、传统狮头，由参赛演出者亲自教授套路基本功。",
    includes: [
      "舞狮历史与象征意义导览讲解",
      "亲手体验鼓、锣与钹",
      "在指导下与伙伴一同尝试舞动狮头",
      "活动结束后与舞狮团队合影",
    ],
    durationLabel: "2 小时",
    venue: "槟城岛",
    venueNote: "槟城岛上的确切地址将由我们的团队在预订后确认。",
    participantsLabel: "参加人数",
    packLabel: "家庭配套",
    packNote: "一口价最多 4 人 —— 每增加一人 MYR 100",
    knowBeforeYouGo: [
      "请穿着方便活动的舒适衣物与包脚鞋。",
      "请提前 15 分钟到场 —— 团队会准时开始。",
      "5 岁及以下儿童免费参加，无需计入下方人数。",
    ],
  },

  batik: {
    name: "峇迪蜡染体验",
    tagline: "亲手画一件真正出自你手的纪念品。",
    description:
      "了解马来西亚峇迪蜡染背后的历史，再亲手绘制一件属于自己的作品带回家。费用已含博物馆门票与茶点。",
    includes: [
      "博物馆门票与蜡染藏品导览",
      "全部材料 —— 布料、防染蜡、染料与画笔",
      "你完成的作品可带回家",
      "活动期间提供茶点",
    ],
    durationLabel: "2 小时",
    venue: "东姑法丽莎博物馆与画廊",
    participantsLabel: "参加人数",
    knowBeforeYouGo: [
      "染料会染色 —— 请穿着不介意沾染的衣物，或自备围裙。",
      "作品需约 30 分钟晾干后方可带走。",
      "4 岁及以下儿童免费参加，无需计入下方人数。",
    ],
  },

  "indian-culture": {
    name: "印度文化体验",
    tagline: "Kolam 米粉画、烹饪课与婆罗多舞。",
    description:
      "在槟城马里安曼兴都庙度过一个下午：亲手尝试 Kolam 米粉地画、上一堂传统印度烹饪课，并欣赏婆罗多舞（Bharatanatyam）现场演出。",
    includes: [
      "Kolam（米粉地画）工作坊",
      "传统印度烹饪课",
      "婆罗多舞现场演出",
      "庙宇及其历史的导览讲解",
    ],
    durationLabel: "2 小时",
    venue: "马里安曼兴都庙",
    participantsLabel: "参加人数",
    knowBeforeYouGo: [
      "庙宇是宗教场所 —— 请穿着遮盖肩膀与膝盖的衣物。",
      "入口处需脱鞋。",
      "5 岁及以下儿童免费参加，无需计入下方人数。",
    ],
  },

  photography: {
    name: "私人摄影拍摄",
    tagline: "与专业摄影师共度 90 分钟，已含于白金通行证。",
    description:
      "由熟悉光线的专业摄影师带你走进乔治市联合国教科文组织世界遗产区，进行一场私人拍摄。白金通行证已包含此项目 —— 你将获得 5 张精修照片与一段 30 秒短片，如需更多可另向摄影师购买。",
    includes: [
      "与专业摄影师进行 90 分钟私人拍摄",
      "全程取景建议与姿势指导",
      "5 张专业精修高清数码照片",
      "一段 30 秒的拍摄精华短片",
    ],
    durationLabel: "90 分钟",
    venue: "乔治市联合国教科文组织世界遗产区",
    venueNote:
      "摄影师将于乔治市世界遗产区与你会合 —— 确切碰面地点将在预订后确认。",
    participantsLabel: "出镜人数",
    includedLabel: "5 张精修照片 + 30 秒短片",
    knowBeforeYouGo: [
      "拍摄仅于周六上午进行 —— 正午前的光线最佳。",
      "5 张精修照片与 30 秒短片将于 7 个工作日内以下载链接交付。",
      "除另行约定外，拍摄从亚美尼亚街出发。",
      "如需本次拍摄的更多精修照片，可当天向摄影师购买。",
    ],
  },
};
