import type en from "../en/registration";

/** 购买登记表单中文文案。 */
const registration: typeof en = {
  steps: {
    label: "第 {n} 步，共 {total} 步",
  },

  cart: {
    heading: "选择你的通行证",
    lede: "每位旅客添加一张通行证。每张通行证均需各自的旅客登记与东京海上保险资料。",
    add: "添加",
    empty: "购物车是空的 —— 请先在上方添加一张通行证。",
    remove: "移除",
    lineItem: "{index}. {tier}通行证 —— MYR {price}",
    totalOne: "合计（{count} 张通行证）",
    totalMany: "合计（{count} 张通行证）",
    continue: "继续填写登记资料",
  },

  details: {
    heading: "第 {n} 位登记人，共 {total} 位 —— {tier}通行证",
    lede:
      "请提供该位旅客的资料，以便我们为你安排顺畅且贴心的旅程体验。" +
      "你的电邮与电话号码将在付款环节安全收集。",
    back: "返回",
    next: "下一位登记人",
    toTerms: "继续阅读条款与条件",
  },

  terms: {
    heading: "条款与条件",
    ledeOne: "请阅读并接受以下条款，以完成 {count} 张通行证的购买。",
    ledeMany: "请阅读并接受以下条款，以完成 {count} 张通行证的购买。",
    consent:
      "本人在此确认，已代表上述每一位登记人阅读、理解并同意 Traveloop 条款与条件" +
      "以及保险条款与条件。本人知悉参与活动属自愿性质，风险由各参加者自行承担。" +
      "本人理解保险保障须受承保人的保单条款、条件、除外责任及最终核准所约束，" +
      "且 Traveloop（Seni Mega Venture Sdn. Bhd.）对承保人拒赔或减赔的任何索赔不承担责任。",
    back: "返回",
    submit: "同意并前往付款",
    redirecting: "正在跳转…",
  },

  fields: {
    fullName: "全名",
    nationality: "国籍",
    selectNationality: "请选择国籍",
    specifyNationality: "请注明国籍",
    arrivalDate: "入境日期",
    departureDate: "离境日期",
    documentType: "旅行证件类型",
    selectDocumentType: "请选择证件类型",
    documentNumber: "证件号码",
    address: "地址",
    emergencySection: "紧急联络人（选填）",
    emergencyName: "紧急联络人姓名",
    emergencyPhone: "紧急联络人电话号码",
    emergencyRelationship: "与紧急联络人的关系",
    selectRelationship: "请选择关系",
    specifyRelationship: "请注明关系",
  },

  errors: {
    checkoutFailed: "无法开始结账流程，请再试一次。",
    network: "网络错误。请检查网络连接后重试。",

    /** 服务端校验，对应 lib/registration.ts 的 RegistrationError。 */
    cartEmpty: "购物车是空的。",
    /** `{max}` 为单笔订单的通行证上限。 */
    tooManyPasses: "单笔订单最多只能购买 {max} 张通行证。",
    paymentsUnavailable: "支付功能尚未开通，请联系我们完成购买。",
    detailsRequired: "请填写报名资料。",
    missingField: "请填写{field}。",
    fieldTooLong: "{field}过长。",
    invalidArrivalDate: "请填写有效的入境日期。",
    invalidDepartureDate: "请填写有效的离境日期。",
    dateOrder: "离境日期必须等于或晚于入境日期。",
    termsNotAccepted: "请先同意条款与条件，才能继续。",

    /** 嵌入上面句子中的字段名称，因此不带标点。 */
    fieldNames: {
      fullName: "姓名",
      nationality: "国籍",
      arrivalDate: "入境日期",
      departureDate: "离境日期",
      travelDocumentType: "旅行证件类型",
      travelDocumentNumber: "证件号码",
      address: "地址",
    },
  },
};

export default registration;
