/**
 * Strings shared by every page: the nav, the footer, the language controls,
 * and the site-level metadata.
 *
 * This file is the source of truth for the *shape* of the common dictionary —
 * `cn/common.ts` is typed against it, so adding a key here and forgetting the
 * Chinese one is a build error, not a page that silently renders English.
 */
const common = {
  site: {
    name: "Traveloop",
    title: "Traveloop — The Tourist Pass for Malaysia",
    titleTemplate: "%s — Traveloop",
    description:
      "Traveloop is a Malaysian tourist pass that bundles retail and dining deals, " +
      "guided cultural experiences (lion dance, batik painting, Indian heritage) and " +
      "Tokio Marine personal accident cover into one card. Based in Penang, Malaysia.",
  },

  nav: {
    skipToContent: "Skip to content",
    home: "Home",
    about: "About",
    partners: "Partners",
    blogs: "Blogs",
    urbanSprint: "Urban Sprint",
    contact: "Contact",
    purchasePass: "Purchase Pass",
    customerPortal: "Customer Portal",
    brandHome: "Traveloop home",
    mainNavigation: "Main navigation",
    mobileNavigation: "Mobile navigation",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    whatsapp: "Chat with us on WhatsApp",
    wechat: "Chat with us on WeChat",
    wechatQr: "WeChat QR code",
    close: "Close",
  },

  language: {
    /** Reads "Language" — labels the switcher for screen readers. */
    label: "Language",
    /** `{language}` is replaced with the autonym, never translated. */
    switchTo: "Switch to {language}",
    bannerText: "This page is also available in English.",
    bannerAction: "Switch to English",
    bannerDismiss: "Dismiss",
  },

  footer: {
    tagline: "Experience Malaysia like never before.",
    instagramSoon: "Instagram — coming soon",
    tiktokSoon: "TikTok — coming soon",
    getInTouch: "Get in touch",
    address: "50, Jalan Khaw Sim Bee, 10400, Georgetown,\nPulau Pinang, Malaysia",
    legal: "Legal",
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    license:
      "MOTAC License: Malaysia Tours & Travel Agency Sdn Bhd.\nNo Siri: P00266 / No. License: 0584",
    copyright: "Copyright © 2026 Traveloop. All Rights Reserved.",
  },

  notFound: {
    title: "Page not found",
    heading: "We can't find that page",
    body: "The link may be out of date, or the page may have moved.",
    cta: "Back to home",
  },
};

export default common;
