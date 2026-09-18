import type en from "../en/home";

/** 首页中文文案。 */
const home: typeof en = {
  meta: {
    title: "Traveloop —— 马来西亚旅游通行证",
    description:
      "Traveloop 是一张马来西亚旅游通行证：购物与餐饮优惠、导览式文化体验，以及东京海上个人意外保障，全部整合于一卡之中。",
  },

  loader: "你的马来西亚故事，就要开始了…",

  hero: {
    eyebrow: "马来西亚首选旅游通行证",
    headingLead: "体验马来西亚，",
    headingEm: "从 Traveloop 开始。",
    copy:
      "发现真实的在地文化、专属优惠、沉浸式体验与顺畅旅程。" +
      "一张 Traveloop 通行证，全部拥有。",
    begin: "开启你的旅程",
    watchStory: "观看影片",
    filmTitle: "Traveloop —— 体验马来西亚",
    scrollAria: "向下滚动探索",
    scrollCue: "向下滚动",
  },

  discover: {
    heading: "看见观光之外的马来西亚。",
    body:
      "从活力都市与地标建筑，到真实的文化体验与在地联结，" +
      "发掘那些让马来西亚鲜活起来的故事、传统与难忘时刻。",
    hint: "点击卡片，让画面动起来",
    comingSoon: "即将推出",
    watchAria: "观看{place}的影片",
    soonAria: "{place} —— 即将推出",
    places: {
      penang: { tag: "老城街巷", name: "槟城" },
      langkawi: { tag: "海岛风光", name: "兰卡威" },
      kualaLumpur: { tag: "城市灯火", name: "吉隆坡" },
    },
  },

  experiences: {
    eyebrow: "旅程的核心",
    headingLead: "在文化之中",
    headingEm: "体验马来西亚",
    body:
      "每一项体验都经过用心策划，让你与定义马来西亚真正精神的人、传统与文化相遇。",
    playVideo: "播放影片",
    videoSoon: "影片即将推出",

    lion: {
      number: "01 / 03 · 华人文化",
      headingLead: "感受舞狮的",
      headingMid: "",
      headingEm: "鼓点与律动。",
      body:
        "走进中华舞狮的世界，亲手体验：学习传统身法、敲奏正统乐器、" +
        "举起狮头舞动，并了解这项标志性技艺背后深厚的文化底蕴。",
      videoTitle: "中华舞狮体验",
      playAria: "播放舞狮影片",
    },
    batik: {
      number: "02 / 03 · 马来文化",
      headingLead: "峇迪蜡染",
      headingEm: "绘画体验。",
      body:
        "在经验丰富的本地手艺人带领下，透过亲手绘制的工作坊，" +
        "沉浸于马来西亚峇迪蜡染的深厚传统。感受这门传统艺术之美，" +
        "创作属于自己的蜡染作品，带回一件独一无二的手作纪念品，" +
        "记住这趟马来西亚之旅。",
      videoTitle: "峇迪蜡染体验",
      playAria: "播放峇迪蜡染影片",
    },
    indian: {
      number: "03 / 03 · 印度文化",
      headingLead: "体验马来西亚的",
      headingEm: "印度传统文化。",
      body:
        "透过精致的 Kolam 地画艺术、道地印度美食与热情好客的在地款待，" +
        "走进一场生动的传统庆典。动手创作、品尝美味，" +
        "与马来西亚最丰厚的文化社群之一真正相遇。",
      videoTitle: "印度传统文化与 Kolam 体验",
      playAria: "播放印度传统文化影片",
    },
  },

  taste: {
    eyebrow: "马来西亚的味道",
    headingLead: "用味蕾",
    headingEm: "认识马来西亚。",
    body:
      "精选在地人气美食、隐世咖啡馆与经典老店，一路吃遍马来西亚。" +
      "全部享有 Traveloop 专属餐饮礼遇。",
    videoTitle: "马来西亚的味道",
    playAria: "播放马来西亚美食影片",
  },

  why: {
    eyebrow: "为什么选择 Traveloop",
    headingLead: "每一段旅程",
    headingEm: "都值得一个故事。",
    body1:
      "在 Traveloop Malaysia，我们相信旅行不只是去过某些地方，" +
      "更在于沿途的片刻、联结与回忆。透过真实的马来西亚文化体验、" +
      "在地发现与有温度的相遇，我们帮助旅人把每一段旅程，变成",
    body2: "一个值得记住的故事",
    body3: "。",
    cta: "查看专属优惠",

    highlights: {
      privileges: {
        headline: "一卡在手，礼遇更多",
        tag: "MYR 18,000+",
        title: "专属旅游礼遇",
        body: "凭一张 Traveloop 通行证，即可享用专属伙伴礼遇、特别优惠与独特体验。",
      },
      local: {
        headline: "体验马来西亚",
        tag: "40+",
        title: "值得信赖的本地伙伴",
        body: "探索在地体验与隐藏景点，走出一般观光的框架。",
      },
      insurance: {
        headline: "安心出行",
        tag: "东京海上",
        title: "个人意外保障",
        body:
          "金卡与白金卡通行证包含由我们的保险伙伴提供的个人意外保障" +
          "及个人意外医疗费用保障。",
      },
    },
  },

  reviews: {
    label: "来自旅人的真实分享",
    rating: "非常棒",
    items: {
      wei: {
        name: "Wei",
        body:
          "狮头比我想象中重太多了！导师很有耐心，还让我们试着打鼓。" +
          "这绝对是我们在吉隆坡参加过最棒的文化活动。",
        activity: "吉隆坡中华舞狮体验",
      },
      aisyah: {
        name: "Aisyah",
        body:
          "超喜欢这个蜡染工作坊！手艺人一步步示范上蜡与染色的技法，" +
          "我还把自己的作品带回家了。雨天午后的绝佳选择。",
        activity: "槟城峇迪蜡染工作坊",
      },
      rajan: {
        name: "Rajan",
        body:
          "用米粉画 Kolam 的过程非常让人静心，之后的美食品尝更是惊艳。" +
          "主人家很用心，让团里每个人都有参与感。",
        activity: "吉隆坡印度传统文化与 Kolam 体验",
      },
    },
  },

  partners: {
    label: "值得信赖的合作伙伴",
  },

  what: {
    eyebrow: "与 Traveloop 一同体验马来西亚",
    heading: "让旅程更有意义，你需要的一切都在这里",
    body1: "从真实的文化体验到专属在地优惠，一切都已为你精心挑选，",
    body2: "你只需要好好享受",
    body3: "。",
    startingFrom: "三个等级，最低仅需",
    launchDiscount: "已应用 5 折专属开卡优惠！",
    cta: "购买通行证",
  },

  faq: {
    headingLead: "常见",
    headingAccent: "问题",
    body: "在你带着 Traveloop 通行证展开马来西亚之旅前，需要知道的一切。",
    stillHaveQuestions: "还有其他疑问？",
    contactUs: "联系我们 →",
    items: {
      refundable: {
        question: "通行证可以退款吗？",
        answer:
          "请联系 Traveloop 客服协助。卡片遗失或损坏，我们可协助补发。" +
          "购买后恕不提供退款。",
      },
      isPolicy: {
        question: "Traveloop 卡是一份旅游保险保单吗？",
        answer:
          "不是。Traveloop 卡包含由我们的保险伙伴提供的个人意外及" +
          "个人意外医疗费用保障，并受适用条款与条件约束。",
      },
      validity: {
        question: "通行证的有效期有多长？",
        answer: "通行证自启用起 30 天内有效，足够你在整趟行程中用完每一项权益。",
      },
      partnerUnavailable: {
        question: "如果某个合作商户暂停营业怎么办？",
        answer:
          "若合作场所暂时无法接待，我们的客服团队会协助你改期，" +
          "或更换至同等的合作商户。",
      },
    },
  },

  closing: {
    heading: "你的旅程，从这里开始。",
    body:
      "为马来西亚而来，带着难忘的故事、真实的体验、专属的礼遇，" +
      "以及旅程结束后仍久久留存的回忆离开。",
    cta: "选择你的 Traveloop 通行证",
  },

  video: {
    playerLabel: "影片播放器",
    close: "关闭影片",
  },
};

export default home;
