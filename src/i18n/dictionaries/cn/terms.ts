import type { LegalSection } from "../../legal";
import type en from "../en/terms";

/**
 * /terms 中文版。
 *
 * 注意：这是英文条款的中文译本，供阅读方便之用。如两种语言有出入，
 * 以英文版本为准（见 hero.prevailing）。
 *
 * NOTE FOR REVIEW: this is a translation of legal text tied to a Malaysian
 * company and a Tokio Marine policy. The `prevailing` line below states that
 * the English version governs, which is the standard protection when a
 * translated contract is published — but the wording of these clauses should
 * still be signed off by whoever approved the English ones.
 */
const terms: typeof en = {
  meta: {
    title: "服务条款",
    description:
      "适用于 Traveloop 各项服务的条款与条件，以及健康、退款、取消、付款与账单政策。",
  },

  hero: {
    eyebrow: "法律条款",
    headingLead: "服务",
    headingEm: "条款。",
    body:
      "欢迎使用 Traveloop。访问或使用本网站即表示你同意以下条款与条件。" +
      "在使用我们的服务前，请仔细阅读。",
    lastUpdated: "最后更新：{date}",
    prevailing:
      "本中文版本仅供阅读方便。若中英文版本存在任何出入，概以英文版本为准。",
  },

  tocTitle: "本页内容",
  tocLabel: "本页内容",

  contact: {
    heading: "对本条款有疑问？",
    bodyBefore: "请发送邮件至 ",
    bodyMiddle: "，或致电 ",
    bodyAfter: "。",
  },

  sections: [
    {
      id: "website-terms",
      label: "1. 网站条款与条件",
      heading: "1. 网站条款与条件",
      blocks: [
        {
          type: "p",
          text:
            "欢迎访问 Traveloop 网站。访问或使用本网站即表示你同意遵守并受本条款与条件约束。" +
            "若你不同意本条款，须立即停止使用本网站。本条款受马来西亚法律管辖。",
        },
        { type: "h3", text: "公司资料" },
        {
          type: "dl",
          items: [
            {
              term: "网站所有者",
              text: "Seni Mega Venture Sdn Bhd，已于马来西亚公司委员会注册",
            },
            {
              term: "营业地址",
              text: "50, Jalan Khaw Sim Bee, 10400 Pulau Pinang, Malaysia",
            },
            {
              term: "电子邮箱",
              text: "traveloop@3d-group.com.my",
              href: "mailto:traveloop@3d-group.com.my",
            },
          ],
        },
        { type: "h3", text: "服务内容" },
        {
          type: "p",
          text:
            "Traveloop 提供旅游相关服务，包括但不限于旅游通行证、精选本地体验、" +
            "旅客 SIM 卡、旅游保险及相关旅游产品。",
        },
        { type: "h3", text: "网站使用" },
        { type: "p", text: "用户同意不得：" },
        {
          type: "ul",
          items: [
            "将本网站用于任何非法目的",
            "试图未经授权访问本网站系统",
            "传播有害软件或恶意代码",
            "从事欺诈性交易",
          ],
        },
        {
          type: "p",
          text: "Traveloop 保留限制或终止违反本条款用户访问权限的权利。",
        },
        { type: "h3", text: "知识产权" },
        { type: "p", text: "本网站的全部内容，包括：" },
        { type: "ul", items: ["标志", "图形", "文字", "图像", "软件"] },
        {
          type: "p",
          text:
            "除另有说明外，均属 Traveloop 的知识产权。未经书面许可，" +
            "用户不得复制、分发或修改本网站的任何内容。",
        },
        { type: "h3", text: "价格与付款" },
        { type: "p", text: "本网站所列的全部价格：" },
        {
          type: "ul",
          items: [
            "除另有说明外，均以马币（MYR）显示。价格可能因汇率变动而未经事先通知即作调整",
            "在法律要求的情况下已包含适用税项",
          ],
        },
        {
          type: "p",
          text:
            "款项通过包括 Stripe 在内的第三方支付处理商安全处理。" +
            "Traveloop 不会存储客户的支付卡信息。",
        },
        { type: "h3", text: "责任限制" },
        { type: "p", text: "Traveloop 不对以下情况承担责任：" },
        {
          type: "ul",
          items: [
            "非其所能控制的旅行中断",
            "第三方服务失误",
            "因用户提供的资料不准确而造成的损失",
          ],
        },
        { type: "p", text: "用户同意自行承担使用本网站的风险。" },
        { type: "h3", text: "第三方服务" },
        {
          type: "p",
          text: "本网站提供的某些服务可能涉及第三方供应商，例如：",
        },
        {
          type: "ul",
          items: ["保险公司", "电信服务供应商", "旅游合作伙伴"],
        },
        {
          type: "p",
          text: "Traveloop 不对第三方供应商的政策或行为承担责任。",
        },
        { type: "h3", text: "适用法律" },
        {
          type: "p",
          text: "本条款受马来西亚法律管辖，包括：",
        },
        {
          type: "ul",
          items: ["1999 年消费者保护法令", "2006 年电子商务法令"],
        },
      ],
    },
    {
      id: "health",
      label: "2. 健康与预约政策",
      heading: "2. 健康与预约政策",
      blocks: [
        {
          type: "p",
          text:
            "Traveloop 高度重视所有客户与员工的健康、安全与福祉。" +
            "为维持安全且负责任的环境，以下政策适用：",
        },
        {
          type: "ol",
          items: [
            {
              lead: "健康告知义务。",
              text: "任何被诊断患有任何形式疾病或身体状况的客户，须就其预订或预约采取相应处理。",
            },
            {
              lead: "取消或改期。",
              text:
                "在完成预订后收到诊断的客户，须立即取消或改期其预约。" +
                "在预订前已知自身身体状况的客户，须在完全康复或取得适当的医疗许可前，" +
                "暂缓进行预订。",
            },
            {
              lead: "恢复服务。",
              text: "客户须在已获妥善治疗且身体状况适宜（如适用）后，方可进行预订或出席预约。",
            },
            {
              lead: "责任与遵守。",
              text:
                "每位客户均有责任遵守本政策，以确保所有人的体验安全。" +
                "若客户看起来身体不适或未遵守本政策，Traveloop 保留拒绝或延后提供服务的权利。",
            },
          ],
        },
      ],
    },
    {
      id: "refunds",
      label: "3. 退款与取消政策",
      heading: "3. 退款与取消政策",
      blocks: [
        { type: "h3", text: "概述" },
        {
          type: "p",
          text: "Traveloop 致力于为经本网站购买的所有旅游服务提供公平、透明的退款政策。",
        },
        { type: "h3", text: "客户取消" },
        {
          type: "p",
          text: "客户可因个人原因取消预订，但付款后的任何取消均不予退款。",
        },
        { type: "h3", text: "不可退款项目" },
        { type: "p", text: "以下项目可能不可退款：" },
        {
          type: "ul",
          items: [
            "已激活的旅客 SIM 卡",
            "已使用的电子代金券",
            "已完成的旅游体验",
            "已签发的保险保单",
          ],
        },
        { type: "h3", text: "Traveloop 取消" },
        { type: "p", text: "Traveloop 可能因以下原因取消服务：" },
        {
          type: "ul",
          items: ["天气状况", "安全考量", "运营问题"],
        },
        { type: "p", text: "若发生上述情况，客户将获得以下其中一项：" },
        {
          type: "ul",
          items: ["全额退款", "改期选项", "等值的替代服务"],
        },
        { type: "h3", text: "退款处理" },
        {
          type: "p",
          text:
            "获批准的退款将按购买时所用的原支付方式处理。" +
            "Stripe 等支付处理商可能需要 5–10 个工作日完成退款。",
        },
        { type: "h3", text: "拒付争议" },
        {
          type: "p",
          text:
            "在向银行或发卡机构发起支付争议之前，建议客户先联系 Traveloop 客服。" +
            "欺诈性拒付可能导致账户被暂停。",
        },
      ],
    },
    {
      id: "payments",
      label: "4. 付款与账单政策",
      heading: "4. 付款与账单政策",
      blocks: [
        { type: "h3", text: "接受的付款方式" },
        {
          type: "p",
          text: "Traveloop 通过安全支付系统接受付款，包括：",
        },
        {
          type: "ul",
          items: ["信用卡", "借记卡", "国际卡支付"],
        },
        { type: "p", text: "款项通过 Stripe 处理。" },
        { type: "h3", text: "货币" },
        {
          type: "p",
          text:
            "所有交易均以马币（MYR）结算。国际客户可能会被其银行收取货币兑换费用。",
        },
        { type: "h3", text: "支付安全" },
        { type: "p", text: "Traveloop 采用行业标准的安全协议，包括：" },
        {
          type: "ul",
          items: ["SSL 加密", "安全支付网关", "欺诈侦测系统"],
        },
        {
          type: "p",
          text: "敏感的支付信息完全由支付处理商处理，不会存储于本网站。",
        },
        { type: "h3", text: "账单资料" },
        { type: "p", text: "客户须提供准确的账单资料，包括：" },
        {
          type: "ul",
          items: ["全名", "账单地址", "电子邮箱地址", "联络电话号码"],
        },
        { type: "p", text: "账单资料有误可能导致付款或退款失败。" },
        { type: "h3", text: "交易确认" },
        { type: "p", text: "成功付款后，客户将收到：" },
        {
          type: "ul",
          items: ["电邮确认", "预订详情", "收据或发票"],
        },
        { type: "h3", text: "防欺诈" },
        { type: "p", text: "Traveloop 保留以下权利：" },
        {
          type: "ul",
          items: ["核实可疑交易", "要求提供额外身份证明", "取消欺诈性预订"],
        },
        { type: "h3", text: "税项" },
        {
          type: "p",
          text:
            "在适用的情况下，交易可能包含马来西亚法律所要求的税项，" +
            "包括销售与服务税项下可能产生的义务。",
        },
      ],
    },
  ] satisfies LegalSection[] as LegalSection[],
};

export default terms;
