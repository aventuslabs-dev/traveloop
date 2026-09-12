import type { BlogBlock, BlogCategory } from "../blog";

/**
 * Chinese for the blog.
 *
 * Slugs, dates, images, authors and category *keys* stay in `blog.ts` — the
 * URL of an article must be the same in both languages so a shared link works
 * either way, and the language switcher can move between them.
 *
 * A post missing from `postCopyCn` simply renders in English, which is the
 * right failure: a new article should appear on the Chinese site the day it is
 * published rather than waiting for a translation.
 *
 * In the phrase tables, the Malay stays Malay — it is what the reader is meant
 * to say out loud. Only the meaning and the note are translated.
 */

export const categoryLabelsCn: Record<BlogCategory, string> = {
  Culture: "文化",
  Food: "美食",
  Guides: "攻略",
  Passes: "通行证",
};

export const authorRoleLabelsCn: Record<string, string> = {
  "Culture Writer": "文化专栏作者",
  "Food Editor": "美食编辑",
  Editorial: "编辑部",
};

export type PostCopy = {
  title?: string;
  excerpt?: string;
  readTime?: string;
  body?: BlogBlock[];
};

export const postCopyCn: Record<string, PostCopy> = {
  "25-malay-phrases-to-learn-before-visiting-malaysia": {
    title: "马来西亚旅行必学的 25 句马来语",
    excerpt:
      "马来西亚是多元文化交融之地，而马来语是串起这一切的那根线。你不需要说得流利 —— 这 25 句日常用语，已足够你点餐、在市集杀价，以及找到路。",
    readTime: "阅读约 7 分钟",
    body: [
      {
        type: "lead",
        text: "马来西亚是多元文化的熔炉，其国语马来语（Bahasa Melayu）约有 58% 的人口使用。",
      },
      {
        type: "para",
        text: "在城市里英语相当通行，一路上你还会听到华语、泰米尔语以及十几种方言。但学几句马来语，仍然是与当地人拉近距离、让旅途更从容的最快方式之一。",
      },
      {
        type: "para",
        text: "你不需要练到流利。以下 25 句，按你真正会遇到的场景分组整理。",
      },

      { type: "heading", text: "问候必备的 5 句马来语" },
      {
        type: "image",
        src: "/blog-malay-greetings.jpg",
        alt: "马来西亚当地人互相问候",
      },
      {
        type: "phrases",
        items: [
          {
            malay: "Selamat pagi. Apa khabar?",
            english: "早安。你好吗？",
            note: "抵达马来西亚第一天，用来向遇到的当地人友善开场。",
          },
          {
            malay: "Selamat petang",
            english: "午安／晚上好。",
            note: "约从下午 2 点用到晚上 7 点左右。",
          },
          {
            malay: "Terima kasih atas bantuan anda",
            english: "谢谢你的帮忙。",
            note: "当有人为你指路，或特地帮了你一把时使用。",
          },
          {
            malay: "Sama-sama",
            english: "不客气。",
            note: "别人向你道谢时的标准回应 —— 字面意思是「彼此彼此」。",
          },
          {
            malay: "Jumpa lagi",
            english: "再见，下次见。",
            note: "离开店家或餐厅时的温暖道别。若是对方要离开，可加上「selamat jalan」—— 一路平安。",
          },
        ],
      },

      { type: "heading", text: "点餐必备的 5 句马来语" },
      {
        type: "image",
        src: "/blog-malay-food.jpg",
        alt: "马来西亚小贩摊位供应本地美食",
      },
      {
        type: "phrases",
        items: [
          {
            malay: "Boleh saya lihat menu?",
            english: "可以给我看看菜单吗？",
            note: "若想要英文版，可加上「menu dalam Bahasa Inggeris」。",
          },
          {
            malay: "Boleh saya minta air kosong?",
            english: "可以给我一杯白开水吗？",
            note: "在马来西亚的炎热天气里必不可少。想要冰的就说「ais kosong」。",
          },
          {
            malay: "Saya ingin order … dan …",
            english: "我想点……和……",
            note: "礼貌的点餐说法 —— 例如「nasi lemak dan ais kosong」。",
          },
          {
            malay: "Makanan ini sangat sedap!",
            english: "这道菜真好吃！",
            note: "马来西亚人对自家美食相当自豪，这句话总能让厨师开心。",
          },
          {
            malay: "Boleh saya dapatkan bil?",
            english: "可以给我账单吗？",
            note: "在餐厅或咖啡馆准备结账时使用。",
          },
        ],
      },

      { type: "heading", text: "购物必备的 5 句马来语" },
      { type: "image", src: "/blog-malay-shopping.jpg", alt: "马来西亚的市集摊位" },
      {
        type: "phrases",
        items: [
          {
            malay: "Berapa harga barang ini?",
            english: "这件东西多少钱？",
            note: "逛市集、纪念品店和小店时最常用的一句。",
          },
          {
            malay: "Boleh kurangkan harga sedikit?",
            english: "可以便宜一点吗？",
            note: "在街边市集讲价是常态 —— 但在购物中心就不适用了。",
          },
          {
            malay: "Ada saiz lain?",
            english: "还有其他尺码吗？",
            note: "买衣服或鞋子时很实用。",
          },
          {
            malay: "Boleh saya bayar dengan kad?",
            english: "可以刷卡吗？",
            note: "结账前先确认为好 —— 不少小摊只收现金。",
          },
          {
            malay: "Boleh saya dapatkan resit?",
            english: "可以给我收据吗？",
            note: "方便记录开销，或日后报销旅费。",
          },
        ],
      },

      { type: "heading", text: "问路必备的 5 句马来语" },
      { type: "image", src: "/blog-malay-directions.jpg", alt: "马来西亚的街景" },
      {
        type: "phrases",
        items: [
          {
            malay: "Maaf, boleh saya tanya satu soalan?",
            english: "不好意思，可以请教一个问题吗？",
            note: "开口求助前，用来礼貌地引起对方注意。",
          },
          {
            malay: "Di mana tandas yang paling dekat?",
            english: "最近的洗手间在哪里？",
            note: "在商场、景点和交通枢纽附近都用得上。",
          },
          {
            malay: "Di mana stesen bas atau stesen kereta api yang paling dekat?",
            english: "最近的巴士站或火车站在哪里？",
            note: "马来西亚的公共交通网络需要一点时间熟悉 —— 这句话很有帮助。",
          },
          {
            malay: "Saya sesat. Boleh tunjukkan jalan?",
            english: "我迷路了，可以帮我指个方向吗？",
            note: "不必不好意思。马来西亚人通常都很乐意为你指路。",
          },
          {
            malay: "Berapa lama perjalanan ke sana?",
            english: "到那里要多久？",
            note: "可以问司机或当地人，不同交通方式各需多长时间。",
          },
        ],
      },

      { type: "heading", text: "日常对话必备的 5 句马来语" },
      {
        type: "image",
        src: "/blog-malay-everyday.jpg",
        alt: "旅客在马来西亚拍照留念",
      },
      {
        type: "phrases",
        items: [
          {
            malay: "Saya tidak faham. Boleh cakap perlahan-lahan?",
            english: "我听不懂，可以说慢一点吗？",
            note: "当对话跟不上时，这是整份清单里最实用的一句。",
          },
          {
            malay: "Boleh tolong ambilkan gambar saya?",
            english: "可以帮我拍张照吗？",
            note: "如果是合照，把「saya」换成「kami」。",
          },
          {
            malay: "Ada Wi-Fi di sini?",
            english: "这里有 Wi-Fi 吗？",
            note: "大多数餐厅、咖啡馆和酒店都有 —— 这就是询问的说法。",
          },
          {
            malay: "Saya alah kepada…",
            english: "我对……过敏。",
            note: "有食物过敏时务必学会。请向服务员或摊主清楚说明。",
          },
          {
            malay: "Boleh tolong panggil teksi?",
            english: "可以帮我叫一辆德士吗？",
            note: "在叫不到 Grab 或没有信号的时候用得上。",
          },
        ],
      },

      { type: "heading", text: "几句话，就能走得更近" },
      {
        type: "para",
        text: "学完这些，你还无法进行完整对话，这完全没关系。这 25 句话真正的作用，是让对方看见你的用心 —— 而在马来西亚，这通常会换来更热情的接待、更好的价格，以及一些你自己绝对找不到的私房推荐。",
      },
      {
        type: "callout",
        text: "正在规划行程？Traveloop 礼遇卡将全马来西亚景点、餐厅与文化体验的专属优惠，整合于一张卡中。",
        cta: { label: "查看通行证", href: "/passes" },
      },
    ],
  },

  "traveloop-malaysia-all-you-need-to-know": {
    title: "关于 Traveloop Malaysia，你需要知道的一切",
    excerpt:
      "规划马来西亚之旅听起来令人兴奋 —— 事实也确实如此 —— 但可选的实在太多了。这里是我们是谁、为何出发，以及每张礼遇卡里有什么。",
    readTime: "阅读约 5 分钟",
    body: [
      {
        type: "lead",
        text: "规划马来西亚之旅听起来令人兴奋 —— 事实也确实如此 —— 但若是第一次来，你可能会发现可选的实在太多了。",
      },
      {
        type: "para",
        text: "马来西亚是东南亚最多元的目的地之一。今天你也许在熙攘的城市中穿行，明天就能在热带海岛放松，或是深入雨林与山巅徒步。",
      },
      {
        type: "para",
        text: "无论走到哪里，你都会遇见丰富交融的文化与传统，以及此生难忘的美食。也正因如此，行程规划反而容易让人无从下手。",
      },
      { type: "para", text: "Traveloop Malaysia 正是为此而生。" },

      { type: "heading", text: "那么，Traveloop Malaysia 是什么？" },
      {
        type: "para",
        text: "这些年来，Traveloop Malaysia 的创始人反复看到同一个难题 —— 国际旅客往往难以找到值得信赖的在地体验，而许多马来西亚商户也难以触及海外访客。",
      },
      {
        type: "para",
        text: "旅客与本地商户之间存在明显的断层。正是这些对话促成了 Traveloop Malaysia 的诞生，为的就是把这道断层接上。",
      },
      {
        type: "para",
        text: "我们的目标很简单：帮助入境的国际访客，发现马来西亚最好的一面。",
      },
      {
        type: "para",
        text: "平台的核心是 Traveloop 礼遇卡，凭卡即可在全马来西亚精选的景点、餐厅与旅游伙伴处解锁优惠、折扣与回馈。",
      },
      {
        type: "para",
        text: "无论你是独自旅行、情侣同行、与朋友结伴、带上全家，还是正在筹备第一趟马来西亚之旅却不知从何开始 —— Traveloop Malaysia 都能帮上忙。",
      },

      { type: "heading", text: "我们为这趟旅程准备了什么" },
      {
        type: "para",
        text: "Traveloop Malaysia 提供银卡、金卡与白金卡三款礼遇卡配套，让你依照旅行风格与预算挑选最合适的一款。每张卡都配有各自的专属优惠、回馈与在地体验，助你把这趟旅程的价值发挥到极致。",
      },

      { type: "subheading", text: "银卡 —— MYR 39.90（原价 MYR 79.90）" },
      {
        type: "para",
        text: "银卡最适合想要划算省钱、同时初步认识马来西亚文化的旅客。内容包括：",
      },
      {
        type: "list",
        items: [
          "最高价值 MYR 15,000 的零售优惠 —— 于参与商户享专属礼遇，包括槟城颠倒博物馆、BMS Organics、Focus Point 与槟城玻璃博物馆。",
          "最高价值 MYR 3,000 的餐饮优惠 —— 于人气咖啡馆与餐厅享折扣，包括 Le Petit Four Pâtisserie、Starbucks、Rendez by Meowcho、Hero Tea、蜜雪冰城与 Family Mart。",
          "季节性文化体验 7.5 折 —— 舞狮体验、峇迪蜡染体验与印度文化体验。",
        ],
      },
      {
        type: "para",
        text: "在舞狮体验中，你将由经验丰富的导师带领学习表演基本功，亲手敲打中国鼓、钹与锣，并披上传统狮被完成简单的动作。场次为周二与周四晚上以及周日下午，5 岁及以下儿童免费参加。",
      },

      { type: "subheading", text: "金卡 —— MYR 69.90（原价 MYR 139.90）" },
      {
        type: "para",
        text: "金卡包含银卡的全部内容，另加旅游与个人意外保险，让你在马来西亚的旅程更加安心。",
      },
      {
        type: "list",
        items: [
          "银卡的全部内容。",
          "由东京海上保险（马来西亚）有限公司承保的团体个人意外保险。",
          "意外身故及残疾保障最高 MYR 50,000，另加 MYR 500 医疗费用。",
        ],
      },

      { type: "subheading", text: "白金卡 —— MYR 89.90（原价 MYR 179.90）" },
      {
        type: "para",
        text: "白金卡是我们最完整的配套。它包含银卡与金卡的全部内容，另加舞狮体验的最大折扣，以及 90 分钟私人摄影拍摄，为你的马来西亚时光留下影像。",
      },
      {
        type: "list",
        items: [
          "金卡的全部内容。",
          "舞狮体验 2.5 折 —— 我们最大的折扣。",
          "专属专业摄影师陪同 90 分钟。",
          "5 张免费高清精修数码照片。",
          "1 段由你的拍摄素材制作的 30 秒免费短片。",
          "全程优先客服支持。",
        ],
      },
      {
        type: "para",
        text: "摄影拍摄于乔治市联合国教科文组织世界遗产区进行，最多可 7 人出镜。",
      },

      { type: "heading", text: "为什么选礼遇卡，而不是一张张代金券？" },
      {
        type: "para",
        text: "比起分别购买多张代金券或各个景点的门票配套，Traveloop 礼遇卡让你用一张卡就能享用一系列专属优惠与折扣。我们的不同之处在于便利 —— 以及每一段旅程中更超值的回报。",
      },
      {
        type: "callout",
        text: "准备开始规划了吗？比较三款礼遇卡，看清每一款究竟包含什么。",
        cta: { label: "开始规划行程", href: "/passes" },
      },
    ],
  },
};
