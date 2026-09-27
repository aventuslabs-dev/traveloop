/**
 * 客户中心（/account）的中文文案。
 *
 * 中文没有单复数变化，因此每个 `{ one, other }` 两种形式都写成同一句 ——
 * 这是刻意的，不是遗漏：词典不应被迫做出这门语言并不存在的区分。
 *
 * 体验名称、场次时间、报价明细与价格都不在此处，它们来自
 * `app/data/experiences.ts`，翻译绝不能影响金额或预订资格。
 */
const account = {
  nav: {
    aria: "账户栏目",
    overview: "总览",
    experiences: "文化体验",
    bookings: "我的预订",
    details: "我的资料",
  },

  header: {
    signOut: "退出登录",
  },

  loading: "加载中…",

  pass: {
    label: "{pass}通行证",
    count: { one: "{n} 张通行证", other: "{n} 张通行证" },
  },

  login: {
    title: "登录你的账户",
    sub: "请使用我们在你购买后发送给你的邮箱与密码。",
    failed: "邮箱或密码不正确。",
    email: "邮箱",
    password: "密码",
    submit: "登录",
    helpBefore: "无法登录？",
    helpLink: "联系我们的团队",
    helpAfter: "，我们会帮你处理。",
    back: "返回 traveloop.my",
  },

  overview: {
    title: "我的账户",
    eyebrow: "Traveloop 客户中心",
    welcome: "欢迎回来。",
    welcomeNamed: "{name}，欢迎回来。",
    lede: "你的通行证、预订与个人资料，都在这里。",

    prompt: {
      empty: "完善你的登记资料",
      missing: { one: "还有 {n} 项资料未填写", other: "还有 {n} 项资料未填写" },
      body: "你的通行证与旅游保险保障，都依赖这些资料完整且准确。",
    },

    currentPass: {
      heading: "当前通行证",
      purchases: { one: "{n} 笔购买", other: "{n} 笔购买" },
      badge: "生效中",
      registered: "登记人：{names}",
      purchased: "购买日期",
      totalPaid: "支付总额",
      tripDates: "行程日期",
      downloadInvoice: "下载发票",
      emptyTitle: "你还没有任何通行证。",
      browsePasses: "浏览通行证",
    },

    stats: {
      tripStarts: "行程开始",
      tripStartsToday: "就在今天",
      tripStartsTomorrow: "就在明天",
      tripStartsIn: { one: "{n} 天后", other: "{n} 天后" },
      tripRunning: "你的行程",
      tripLastDay: "最后一天",
      tripDaysLeft: { one: "还剩 {n} 天", other: "还剩 {n} 天" },
      tripEnded: "行程已结束",
      upcoming: { one: "即将到来的场次", other: "即将到来的场次" },
      included: { one: "已包含的体验", other: "已包含的体验" },
    },

    experiences: {
      heading: "文化体验",
      seeAll: "查看全部",
      nextSession: "下一场体验",
      confirmed: "已确认",
      awaiting: "等待确认",
      lede: "已包含在你的通行证中 —— 预订场次，当天到场馆支付。",
    },

    history: {
      heading: "购买记录",
      trip: "行程 {dates}",
      downloadInvoice: "下载发票 {number}",
      passNumbers: "通行证号码 {numbers}",
    },

    manage: {
      heading: "账户管理",
      detailsTitle: "我的资料",
      detailsBody: "登记资料、紧急联络人，以及你登录所用的密码。",
      detailsCue: "打开",
      helpTitle: "需要帮助？",
      helpBody: "关于通行证、预订或保险保障的任何问题，随时问我们。",
      helpCue: "联系我们",
    },
  },

  bookings: {
    title: "我的预订",
    eyebrow: "文化体验",
    lede: "你已预订的场次。费用于当天在场馆支付。",

    status: {
      pending: "等待确认",
      confirmed: "已确认",
      cancelled: "已取消",
      completed: "已完成",
    },

    flashBooked: "已收到预订 {reference} —— 详情已发送至你的邮箱，我们会尽快确认场次。",
    flashCancelled: "预订 {reference} 已取消。",
    flashTooLate:
      "该场次距离开始已不足 {hours} 小时，无法在线取消。请联系我们，我们会帮你处理。",
    flashCancelFailed: "我们无法取消该预订，请再试一次。",

    upcoming: "即将到来",
    pastAndCancelled: "已结束与已取消",
    emptyTitle: "你还没有预订任何场次。",
    browseExperiences: "浏览体验",

    card: {
      date: "日期",
      time: "时间",
      venue: "地点",
      venueTbc: "由我们的团队确认",
      participants: "参加人数",
      plusChildren: { one: " + {n} 名儿童（免费）", other: " + {n} 名儿童（免费）" },
      wasQuoted: "原报价",
      payAtVenue: "于场馆支付",
      bookedWith: "使用的通行证",
      pass: "{pass}通行证",
      addToCalendar: "加入日历",
      cancel: "取消预订",
    },
  },

  experiences: {
    title: "文化体验",
    eyebrow: "通行证已包含",
    ledeNoPass: "遍布槟城的亲手体验课程，已包含在你的 Traveloop 通行证中。",
    lede:
      "{total} 项体验中有 {unlocked} 项已包含在你的通行证内。请至少提前 {days} 天预订 —— 通行证折扣在预订时即已计入，费用于当天在场馆支付。",
    emptyTitle: "购买通行证后即可预订体验。",
    browsePasses: "浏览通行证",

    card: {
      included: "{pass}通行证已包含",
      tiersOnly: "仅限 {tiers}",
      nextSessionBefore: "下一场 ",
      noSessions: "你的行程期间没有可预订场次",
      cta: "查看日期与价格",
      lockedNote: "你的通行证未包含此项 —— 升级即可解锁。",
      comparePasses: "比较通行证",
    },
  },

  book: {
    title: "预订{experience}",
    titleFallback: "预订体验",
    back: "全部体验",

    alreadyBooked: "你已有一个即将到来的{experience}预订。",
    viewBookings: "查看我的预订",

    notIncluded: "{experience}包含在{tiers}通行证中。",
    notIncludedWithYours: "{experience}包含在{tiers}通行证中，而你持有的并非该通行证。",
    comparePasses: "比较通行证",

    runs: "开放时间",
    duration: "时长",
    venue: "地点",
    whatsIncluded: "包含内容",
    knowBefore: "参加前须知",
  },

  bookingForm: {
    noSessions: "目前没有可为你安排的{experience}场次。",
    noSessionsInTrip:
      "在 {trip} 期间目前没有可为你安排的{experience}场次 —— 预订需提前 {days} 天。",
    talkToUs: "联系我们的团队",

    bookWith: "使用的通行证",
    passChip: "{pass}通行证",
    passDiscount: "{discount}",

    pickDate: "选择日期",
    onlyAvailable: "仅可选择有场次的日期。",
    limitedToTrip: "仅限你的行程期间：{trip}。",
    previousMonth: "上个月",
    nextMonth: "下个月",
    weekdayInitials: ["一", "二", "三", "四", "五", "六", "日"],

    pickTime: "选择时间",
    full: "已满",
    spotsLeft: { one: "剩余 {n} 位", other: "剩余 {n} 位" },

    location: "地点",
    comingSoon: " —— 即将开放",

    whosComing: "参加人员",
    groupCovers: "团体配套最多涵盖 {n} 人",
    childrenUnder: "{age} 岁以下儿童",
    childrenFree: "免费参加 —— 无需计入上方人数",
    fewer: "减少 —— {label}",
    more: "增加 —— {label}",

    choosePackage: "选择配套",
    perPerson: "按人计价",
    perPersonNote: "{n} 人均享你的{pass}通行证价格",

    notes: "有什么需要我们留意的吗？（选填）",
    notesPlaceholder: "饮食需求、行动需求，或想庆祝的生日……",

    summary: "你的预订",
    payableAtVenue: "于场馆支付",
    saving: "你的{pass}通行证为本次预订节省 {amount}。",

    consent:
      "我明白现在不会扣款 —— {amount} 将于当天在场馆支付 —— 并且我可在场次开始前 {hours} 小时之前免费取消。",

    submit: "确认预订",
    submitting: "预订中…",
  },

  details: {
    title: "我的资料",
    eyebrow: "你的账户",
    lede: "我们为你保存的资料，以及你登录本中心所用的密码。",

    savedFlash: "你的资料已保存。",
    saveFailedFlash: "我们无法保存你的资料，请再试一次。",

    registrationHeading: "登记资料",
    filledCount: "{total} 项中已填写 {filled} 项",
    registrationLede:
      "这些资料在你购买通行证时收集。请保持准确 —— 你的通行证与旅游保险保障都依赖它们。",

    meterAria: "登记资料完整度",
    complete: "所需资料均已齐全。",
    stillMissing: "尚未填写：{fields}。",

    termsAccepted: "你已于 {date} 接受 Traveloop 条款与保险条件。",

    securityHeading: "登录与安全",
    securityLede: "你的邮箱即本中心的用户名。如需更改，请联系我们。",
    emailLabel: "邮箱地址",
    changePassword: "修改密码",

    passwordUpdatedFlash: "你的密码已更新。",
    passwordTooShortFlash: "密码长度至少需 {n} 位。",
    passwordMismatchFlash: "两次输入的密码不一致。",
    passwordFailedFlash: "我们无法更新你的密码，请再试一次。",
  },

  profile: {
    rows: {
      fullName: "姓名",
      nationality: "国籍",
      travelDocument: "旅行证件",
      documentNumber: "证件号码",
      address: "住址",
      emergencyContact: "紧急联络人",
      emergencyPhone: "紧急联络电话",
      relationship: "关系",
    },

    notProvided: "未填写",
    edit: "编辑资料",
    emptyBody:
      "我们还没有你的登记资料。填写大约只需一分钟，你的通行证与保险保障都需要这些资料。",
    addDetails: "填写资料",

    form: {
      aboutYou: "个人资料",
      fullName: "姓名",
      fullNamePlaceholder: "请与旅行证件上的姓名一致",
      nationality: "国籍",
      notSet: "未设置",
      otherNationality: "请注明你的国籍",
      documentType: "旅行证件类型",
      documentNumber: "证件号码",
      address: "住址",
      addressPlaceholder: "街道、城市、邮编、国家",

      emergencyHeading: "紧急联络人",
      emergencyHint: "若你在旅途中发生意外，我们将代你联络的人。",
      contactName: "联络人姓名",
      contactPhone: "联络电话号码",
      contactPhonePlaceholder: "请包含国家区号",
      relationship: "与你的关系",
      otherRelationship: "请注明关系",

      cancel: "取消",
      save: "保存资料",
    },
  },

  password: {
    newPassword: "新密码",
    confirmPassword: "确认新密码",
    show: "显示密码",
    hide: "隐藏密码",
    ruleLength: "至少 {n} 位字符",
    ruleMatch: "两次输入一致",
    submit: "更新密码",
  },
};

export default account;
