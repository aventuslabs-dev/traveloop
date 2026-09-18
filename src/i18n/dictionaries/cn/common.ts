import type en from "../en/common";

/**
 * 中文版共用文案。类型绑定 en/common.ts —— 英文新增了键而这里没有，构建会失败。
 *
 * Typed as `typeof en`, so this file cannot drift from the English one: a key
 * added there and missed here fails the build. Edit any string freely.
 */
const common: typeof en = {
  site: {
    name: "Traveloop",
    title: "Traveloop —— 马来西亚旅游通行证",
    titleTemplate: "%s — Traveloop",
    description:
      "Traveloop 是一张马来西亚旅游通行证，将购物与餐饮优惠、" +
      "文化体验（舞狮、峇迪蜡染、印度传统文化）以及东京海上个人意外保障" +
      "整合于一卡之中。总部设于马来西亚槟城。",
    ogImageAlt: "两位旅人在日落时分眺望乔治市天际线，画面上方是 Traveloop 标志。",
  },

  nav: {
    skipToContent: "跳至主要内容",
    home: "首页",
    about: "关于我们",
    partners: "合作伙伴",
    blogs: "博客",
    urbanSprint: "城市冲刺",
    contact: "联系我们",
    purchasePass: "购买通行证",
    customerPortal: "会员中心",
    brandHome: "Traveloop 首页",
    mainNavigation: "主导航",
    mobileNavigation: "手机导航",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
    whatsapp: "通过 WhatsApp 联系我们",
    wechat: "通过微信联系我们",
    wechatQr: "微信二维码",
    close: "关闭",
  },

  language: {
    label: "语言",
    switchTo: "切换至{language}",
    bannerText: "本页面提供中文版本。",
    bannerAction: "切换至中文",
    bannerDismiss: "关闭",
  },

  footer: {
    tagline: "以前所未有的方式体验马来西亚。",
    instagramSoon: "Instagram —— 敬请期待",
    tiktokSoon: "TikTok —— 敬请期待",
    getInTouch: "联系我们",
    address: "50, Jalan Khaw Sim Bee, 10400, Georgetown,\nPulau Pinang, Malaysia",
    legal: "法律条款",
    terms: "服务条款",
    privacy: "隐私政策",
    license:
      "MOTAC 执照：Malaysia Tours & Travel Agency Sdn Bhd.\n编号：P00266 / 执照号：0584",
    copyright: "版权所有 © 2026 Traveloop。保留一切权利。",
  },

  notFound: {
    title: "页面不存在",
    heading: "找不到该页面",
    body: "链接可能已失效，或页面已迁移。",
    cta: "返回首页",
  },
};

export default common;
