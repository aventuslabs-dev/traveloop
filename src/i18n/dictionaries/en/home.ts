/**
 * The homepage.
 *
 * Video ids, image paths and the pass prices are not here — the prices come
 * from `app/data/passes.ts` so the "starting from" figure can never disagree
 * with the pricing page.
 */
const home = {
  meta: {
    title: "Traveloop — The Tourist Pass for Malaysia",
    /**
     * Kept under ~155 characters: past that a search result cuts the sentence
     * off mid-clause. The longer version — the experiences named one by one,
     * the Penang address — still reaches search engines through the structured
     * data in the root layout, which has no such limit.
     */
    description:
      "Traveloop is a Malaysian tourist pass: retail and dining deals, guided cultural experiences and Tokio Marine personal accident cover, all on one card.",
  },

  loader: "Your Malaysian story begins…",

  hero: {
    eyebrow: "The Premier Tourist Pass for Malaysia",
    headingLead: "Experience Malaysia,",
    headingEm: "with Traveloop.",
    copy:
      "Discover authentic culture, exclusive local deals, immersive experiences, " +
      "and seamless travel. All with one Traveloop Pass.",
    begin: "Begin your journey",
    watchStory: "Watch the story",
    filmTitle: "Traveloop — Experience Malaysia",
    scrollAria: "Scroll to discover",
    scrollCue: "Scroll to travel",
  },

  discover: {
    heading: "Discover Malaysia Beyond Sightseeing.",
    body:
      "From vibrant cities and iconic landmarks to authentic cultural experiences " +
      "and local connections, uncover the stories, traditions, and memorable " +
      "moments that bring Malaysia to life.",
    hint: "Tap a card to watch it come to life",
    comingSoon: "Coming soon",
    /** `{place}` is the destination name. */
    watchAria: "Watch a video of {place}",
    soonAria: "{place} — coming soon",
    places: {
      penang: { tag: "Heritage Streets", name: "Penang" },
      langkawi: { tag: "Island Shores", name: "Langkawi" },
      kualaLumpur: { tag: "City Lights", name: "Kuala Lumpur" },
    },
  },

  experiences: {
    eyebrow: "The heart of the journey",
    headingLead: "Experience Malaysia",
    headingEm: "through its culture",
    body:
      "Every experience is thoughtfully curated to connect you with the people, " +
      "traditions, and culture that define the true spirit of Malaysia.",
    playVideo: "Play Video",
    /** Shown in place of the play button until an experience has its footage. */
    videoSoon: "Video coming soon",

    lion: {
      number: "01 / 03 · Chinese Culture",
      headingLead: "Feel the rhythm",
      headingMid: "of ",
      headingEm: "lion dance.",
      body:
        "Step into the world of Chinese Lion Dance with a hands-on experience where " +
        "you'll learn traditional movements, play authentic instruments, perform with " +
        "a lion head, and discover the rich cultural heritage behind this iconic art.",
      videoTitle: "Chinese Lion Dance Experience",
      playAria: "Play lion dance video",
    },
    batik: {
      number: "02 / 03 · Malay Culture",
      headingLead: "Batik Painting",
      headingEm: "Experience.",
      body:
        "Immerse yourself in the rich heritage of Malaysian Batik through a hands-on " +
        "painting workshop led by experienced local artisans. Discover the beauty of " +
        "this traditional art form as you create your own Batik masterpiece and take " +
        "home a unique handmade souvenir to remember your Malaysian journey.",
      videoTitle: "Batik Painting Experience",
      playAria: "Play batik painting video",
    },
    indian: {
      number: "03 / 03 · Indian Culture",
      headingLead: "Experience Malaysia's",
      headingEm: "Indian Heritage.",
      body:
        "Step into a vibrant celebration of tradition through the intricate art of " +
        "Kolam, authentic Indian cuisine, and warm local hospitality. Create, taste, " +
        "and connect with one of Malaysia's richest cultural communities.",
      videoTitle: "Indian Heritage & Kolam Experience",
      playAria: "Play Indian heritage video",
    },
  },

  taste: {
    eyebrow: "The Taste of Malaysia",
    headingLead: "Discover Malaysia",
    headingEm: "Through Its Flavours.",
    body:
      "Taste your way through Malaysia with handpicked local favourites, hidden cafés, " +
      "and iconic eateries. All with exclusive Traveloop dining privileges.",
    videoTitle: "The Taste of Malaysia",
    playAria: "Play a taste of Malaysia video",
  },

  why: {
    eyebrow: "Why Choose Traveloop",
    headingLead: "Every Journey Deserves",
    headingEm: "a Story.",
    /** Split so the closing clause can be highlighted; `body2` is the highlight. */
    body1:
      "At Traveloop Malaysia, we believe travel is more than just visiting places, " +
      "it is about the moments, connections, and memories created along the way. " +
      "Through authentic Malaysian cultural experiences, local discoveries, and " +
      "meaningful encounters, we help travellers turn every journey into ",
    body2: "a story worth remembering",
    body3: ".",
    cta: "View Exclusive Deals",

    highlights: {
      privileges: {
        headline: "One Pass. More Benefits",
        tag: "MYR 18,000+",
        title: "Exclusive Travel Privileges",
        body:
          "Access exclusive partner benefits, special offers and unique experiences " +
          "with one Traveloop Pass.",
      },
      local: {
        headline: "Experience Malaysia",
        tag: "40+",
        title: "Trusted Local Partners",
        body: "Explore Local Experiences and hidden gems beyond ordinary sightseeing.",
      },
      insurance: {
        headline: "Travel Worry-Free",
        tag: "Tokio Marine",
        title: "Personal Accident Protection",
        body:
          "Gold and Platinum passes include Personal Accident coverage and PA Medical " +
          "Expense benefits provided by our insurance partner.",
      },
    },
  },

  reviews: {
    label: "Stories from Fellow Travellers",
    rating: "Fantastic",
    items: {
      wei: {
        name: "Wei",
        body:
          "The lion head was so much heavier than I expected! Our instructor was patient " +
          "and let us try the drums too. Best cultural activity we did in KL, hands down.",
        activity: "Chinese Lion Dance Experience in Kuala Lumpur",
      },
      aisyah: {
        name: "Aisyah",
        body:
          "Loved the batik workshop! The artisan showed us the wax and dye technique step " +
          "by step, and I got to take my canvas home. Great for a rainy afternoon.",
        activity: "Batik Painting Workshop in Penang",
      },
      rajan: {
        name: "Rajan",
        body:
          "Learning to draw kolam with rice flour was so calming, and the food tasting " +
          "after was incredible. Our host made sure everyone in the group felt included.",
        activity: "Indian Heritage & Kolam Experience in Kuala Lumpur",
      },
    },
  },

  partners: {
    label: "Our Trusted Partners",
  },

  what: {
    eyebrow: "Experience Malaysia with Traveloop",
    heading: "Everything You Need for a More Meaningful Journey",
    body1:
      "Everything has been carefully curated, from authentic cultural experiences to " +
      "exclusive local deals, ",
    body2: "so all you have to do is enjoy",
    body3: ".",
    startingFrom: "Three tiers starting from",
    /** Worded for the live automatic discount — see launchBadge in data/passes.ts. */
    launchDiscount: {
      percent: "Exclusive {percent}% launch discount applied!",
      amount: "Exclusive MYR {amount} off every pass — launch discount applied!",
    },
    cta: "Purchase Pass",
  },

  faq: {
    headingLead: "Frequently Asked ",
    headingAccent: "Questions",
    body:
      "Everything you need to know before you start exploring Malaysia with your " +
      "Traveloop Pass.",
    stillHaveQuestions: "Still have questions?",
    contactUs: "Contact Us →",
    items: {
      refundable: {
        question: "Is the pass refundable?",
        answer:
          "Please contact Traveloop for support. We can assist with card replacement for " +
          "lost or damaged cards. Refunds are not available after purchase.",
      },
      isPolicy: {
        question: "Is Traveloop Card a travel insurance policy?",
        answer:
          "No. The Traveloop Card includes Personal Accident and Personal Accident Medical " +
          "Expense benefits provided through our insurance partner, subject to applicable " +
          "terms and conditions.",
      },
      validity: {
        question: "How long is my pass valid?",
        answer:
          "Your pass is valid for 30 days from activation, giving you a full trip window " +
          "to redeem every perk.",
      },
      partnerUnavailable: {
        question: "What if a partner isn't available?",
        answer:
          "If a partner venue is temporarily unavailable, our support team will help you " +
          "rebook or swap to an equivalent partner.",
      },
    },
  },

  closing: {
    heading: "Your Journey Starts Here.",
    body:
      "Come for Malaysia. Leave with unforgettable stories, authentic experiences, " +
      "exclusive privileges, and memories that last long after your trip ends.",
    cta: "Choose your Traveloop Pass",
  },

  video: {
    playerLabel: "Video player",
    close: "Close video",
  },
};

export default home;
