import type en from "../en/contact";

/** /contact 中文文案。 */
const contact: typeof en = {
  meta: {
    title: "联系我们",
    description:
      "对 Traveloop 通行证、预订或合作有疑问？欢迎联系我们位于马来西亚槟城的团队 —— 我们会在一个工作日内回复。",
    ogTitle: "联系 Traveloop",
    ogDescription: "对通行证、预订或合作有疑问？我们会在一个工作日内回复。",
  },

  hero: {
    eyebrow: "联系我们",
    headingLead: "我们很期待",
    headingEm: "收到你的来信。",
    body:
      "关于 Traveloop 通行证的问题、合作洽谈，或是需要协助规划行程？" +
      "欢迎与我们联系，团队会尽快回复你。",
  },

  cards: {
    whatsappTitle: "WhatsApp 联系",
    emailTitle: "电邮联系",
    responseTitle: "回复时间",
    responseValue: "我们会在 1 个工作日内回复",
    basedTitle: "所在地",
    basedValue: "马来西亚槟城",
    note:
      "想直接聊聊？通过 WhatsApp 联系我们回复最快，" +
      "服务时间为周一至周五，马来西亚时间上午 9 点至下午 6 点。",
  },

  subjects: {
    general: "一般咨询",
    pricing: "通行证与价格",
    partner: "商务合作",
    booking: "预订协助",
  },

  form: {
    name: "姓名",
    namePlaceholder: "你的姓名",
    email: "电子邮箱",
    emailPlaceholder: "you@example.com",
    subject: "主题",
    message: "留言",
    messagePlaceholder: "我们能为你做些什么？",
    send: "发送留言",
    sending: "发送中…",
    successTitle: "留言已发送！",
    successBody: "感谢你的来信 —— 我们的团队会在一个工作日内回复你。",
    passPrefill: "你好，我对 {pass} 通行证有兴趣，能否介绍一下购买方式？",
  },

  errors: {
    missing: "请填写姓名、电子邮箱和留言内容。",
    email: "这个电子邮箱地址看起来不太对。",
    tooLong: "留言内容过长 —— 请精简后重试。",
    sendFailed:
      "暂时无法发送你的留言。请发送邮件至 hello@traveloop.my，或通过 WhatsApp 联系我们。",
  },
};

export default contact;
