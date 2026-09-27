import type en from "../en/checkout";

/** /passes/register 与 /passes/success 中文文案。 */
const checkout: typeof en = {
  register: {
    meta: {
      title: "完成登记",
      description: "为每位旅客登记并完成 Traveloop 通行证购买。",
    },
    eyebrow: "你的订单",
    heading: "创建你的订单",
    lede: "为每位旅客各添加一张通行证 —— 同行的每个人都需要各自的旅客登记与保险资料。",
    back: "← 选择其他通行证",
  },

  success: {
    meta: {
      title: "订单已确认",
      description: "你的 Traveloop 通行证订单确认。",
    },

    paidEyebrow: "订单已确认",
    processingEyebrow: "付款处理中",

    paidHeadingLead: "欢迎加入，",
    paidHeadingEm: "{name}。",
    fallbackName: "旅人",

    processingHeadingLead: "就快好了 ——",
    processingHeadingEm: "正在确认你的付款。",

    paidLede: "你的{pass}已确认，收据正发送{email}。以下是抵达槟城后领取实体通行证的方式。",
    paidEmailSuffix: "至 {email}",

    processingLede:
      "你的银行尚未确认这笔转账 —— 这可能需要几分钟。款项到账后我们会立即以电邮通知你{email}。无需重复付款。",
    processingEmailSuffix: "（{email}）",

    singlePassName: "{pass}通行证",

    passLabelOne: "通行证",
    passLabelMany: "通行证",
    total: "总额",
    reference: "订单编号",

    customerPortal: "会员中心",
    downloadInvoice: "下载发票",
    needHelp: "需要协助？",

    noteWithReference: "如需就本次购买联系我们，请提供你的订单编号。",
    noteWithoutReference:
      "你的订单编号载于我们发送的收据电邮中 —— 如需就本次购买联系我们，请提供该编号。",

    unavailableEyebrow: "无法获取订单状态",
    unavailableHeadingLead: "我们无法载入",
    unavailableHeadingEm: "这笔订单。",
    unavailableLede:
      "若你已完成付款，请放心 —— 款项仍已成功处理，收据正以电邮送出。欢迎联系我们，我们会为你确认详情。",
    contactUs: "联系我们",
    backToPasses: "返回通行证页面",
  },

  passNumbers: {
    heading: { one: "你的通行证号码", other: "你的通行证号码" },
    hint: "在柜台出示此号码即可，无需打印。号码也已发送至你的电邮。",
    pending: "你的通行证号码正在生成中，几分钟内将发送至你的确认电邮，并显示在会员中心。",
    ready: "待领取",
    collected: "已于 {date} 领取",
  },

  collection: {
    eyebrow: "领取实体通行证",
    place: "槟城国际机场",
    area: "入境大厅",
    directions: "走出入境大厅，黄色的机场德士服务柜台（Airport Taxi Services）就在你的正前方。",
    hours: "每日开放，早上 7:00 至最后一班航班。",
    stepsHeading: "在柜台",
    steps: {
      one: ["出示你的护照。", "提供你的通行证号码。"],
      other: ["出示每位旅客的护照。", "提供每张通行证的号码。"],
    },
    map: "在 Google 地图中打开",
    photoAlt: "槟城国际机场入境大厅外的黄色机场德士服务柜台",
  },
};

export default checkout;
