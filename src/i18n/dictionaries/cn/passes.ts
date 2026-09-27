import type en from "../en/passes";

/** /passes 中文文案。 */
const passes: typeof en = {
  meta: {
    title: "旅游通行证与价格",
    description:
      "比较银卡、金卡与白金卡 Traveloop 通行证：最高价值 MYR 18,000 的购物与餐饮优惠、文化体验，以及东京海上意外保障。MYR 39.90 起。",
    ogDescription:
      "马来西亚银卡、金卡与白金卡旅游通行证。购物与餐饮优惠、文化体验及个人意外保障，MYR 39.90 起。",
  },

  hero: {
    eyebrow: "通行证",
    headingLead: "选择你的",
    headingEm: "马来西亚通行证。",
    lede:
      "一张通行证，解锁全马来西亚的购物优惠、餐饮礼遇与专属文化体验 —— " +
      "挑选最适合这趟旅程的等级。",
    cta: "查看全部三款通行证",
  },

  pricing: {
    eyebrow: "价格",
    headingLead: "三个等级。",
    headingEm: "一趟难忘旅程。",
    viewLabel: "价格显示方式",
    cardView: "卡片视图",
    tableView: "权益对比",
    launchDiscount: {
      percent: "已应用 {zhe} 折专属开卡优惠！",
      amount: "每张通行证立减 MYR {amount}，已应用专属开卡优惠！",
    },
    passName: "{tier}通行证",
    choose: "选择{tier}",
    perkColumn: "权益",
    notIncluded: "—",
  },

  safety: {
    headingLead: "你的安全，",
    headingEm: "我们的首要之责",
    body:
      "我们不只为你省钱，更提供全方位的安心保障。" +
      "有了 Traveloop 卡，你在马来西亚遇到任何旅途紧急状况时，" +
      "都有一位可靠的伙伴随时协助。",
    features: {
      helpline: {
        title: "24/7 紧急求助热线",
        body: "在最需要的时候即时获得协助。我们的专属支援热线可直接为你接通本地紧急服务，确保你不会孤立无援。",
      },
      embassy: {
        title: "使领馆协助",
        body: "安心出行，援助只需一通电话。若你需要官方协助，我们可为你直接联系母国的大使馆与领事馆。",
      },
      coordination: {
        title: "医疗与警方协调",
        body: "遇到突发状况时，我们会在你与本地当局或医院之间搭起桥梁，全程引导，直到你安全无虞。",
      },
    },
  },

  faq: {
    eyebrow: "常见问题",
    headingLead: "关于通行证的",
    headingEm: "常见疑问。",
    items: {
      redeem: {
        question: "如何使用通行证的各项权益？",
        answer:
          "结账时预订各项文化体验（舞狮、峇迪蜡染、印度文化），随后在合作商户出示你的通行证确认信息，即可享用购物与餐饮优惠。",
      },
      insurance: {
        question: "随附的旅游保险保障哪些内容？",
        answer:
          "金卡与白金卡通行证包含由东京海上保险（马来西亚）有限公司承保的团体个人意外保险 —— 意外身故或永久残疾最高 MYR 50,000，意外医疗费用最高 MYR 500，承保在马来西亚境内、年龄介于 30 天至 75 岁的已登记参加者。",
      },
      claim: {
        question: "如何申请保险理赔？",
        answer:
          "请于事故发生后 5 天内，通过 insurance@traveloop.my 或 WhatsApp +6011-3949 2888 通知我们的团队，并提交填妥的索赔表格、医疗报告、原始收据及身份证件副本。",
      },
      isPolicy: {
        question: "Traveloop 卡是一份旅游保险保单吗？",
        answer:
          "不是。Traveloop 卡包含由我们的保险伙伴提供的个人意外及个人意外医疗费用保障，并受适用条款与条件约束。",
      },
      children: {
        question: "儿童可以参加文化体验吗？",
        answer:
          "可以 —— 4 岁或 5 岁及以下（视具体体验而定）的儿童，在付费成人陪同下可免费参加。",
      },
      photography: {
        question: "白金卡的摄影拍摄需要提前多久预订？",
        answer:
          "至少提前 3 天，并视摄影师与时段供应情况而定。拍摄于周六上午进行，时段为 8:30–10:00 与 10:00–11:30，地点在乔治市联合国教科文组织世界遗产区一带。",
      },
    },
  },

  closing: {
    eyebrow: "随时为你准备",
    heading: "今天就领取你的 Traveloop 通行证。",
    body: "在选定等级前还有疑问？我们的团队可以协助你挑选最适合这趟旅程的通行证。",
    talkToUs: "联系我们",
    whatsapp: "WhatsApp 联系",
  },
};

export default passes;
