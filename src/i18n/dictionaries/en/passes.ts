/**
 * /passes — the pricing page.
 *
 * Tier names, perk bullets and the comparison table are *not* here: they are
 * generated in `app/data/passes.ts` from the live prices, so that a shopper
 * always compares real amounts. Only the page's own furniture lives here.
 */
const passes = {
  meta: {
    title: "Tourist Passes & Pricing",
    description:
      "Compare the Silver, Gold and Platinum Traveloop Passes: retail and dining deals worth up to MYR 18,000, discounted cultural experiences, and Tokio Marine personal accident cover. From MYR 39.90.",
    ogDescription:
      "Silver, Gold and Platinum tourist passes for Malaysia. Retail and dining deals, cultural experiences, and personal accident cover from MYR 39.90.",
  },

  hero: {
    eyebrow: "Passes",
    headingLead: "Choose your",
    headingEm: "Malaysia pass.",
    lede:
      "One pass unlocks retail deals, food & beverage privileges, and exclusive " +
      "cultural experiences across Malaysia — pick the tier that fits your trip.",
    cta: "See all three passes",
  },

  pricing: {
    eyebrow: "Pricing",
    headingLead: "Three tiers.",
    headingEm: "One unforgettable trip.",
    viewLabel: "Pricing view",
    cardView: "Card view",
    tableView: "Compare perks",
    launchDiscount: "Exclusive 50% launch discount applied!",
    /** `{tier}` is the tier name, e.g. "Gold". */
    passName: "{tier} Pass",
    choose: "Choose {tier}",
    perkColumn: "Perk",
    /** Shown in a comparison cell for a perk a tier doesn't get. */
    notIncluded: "—",
  },

  safety: {
    headingLead: "Your Safety,",
    headingEm: "Our Priority",
    body:
      "We do more than just save you money; we provide comprehensive peace of mind. " +
      "With the Traveloop card, you gain a reliable partner ready to assist you " +
      "during any travel emergency in Malaysia.",
    features: {
      helpline: {
        title: "24/7 Emergency Helpline",
        body: "Get immediate assistance when you need it most. Our dedicated support line connects you directly to local emergency services to ensure you are never stranded.",
      },
      embassy: {
        title: "Embassy and Consular Support",
        body: "Travel with the confidence that help is a phone call away. We provide direct access to your home country's embassies and consulates should you need official assistance.",
      },
      coordination: {
        title: "Medical and Police Coordination",
        body: "In the event of a crisis, we bridge the gap between you and local authorities or hospitals, guiding you through the process until you are safe and secure.",
      },
    },
  },

  faq: {
    eyebrow: "FAQ",
    headingLead: "Questions about",
    headingEm: "your pass.",
    items: {
      redeem: {
        question: "How do I redeem my pass perks?",
        answer:
          "Book each cultural experience (Lion Dance, Batik Painting, Indian Culture) during checkout, then show your pass confirmation at partner locations to redeem retail and food & beverage deals.",
      },
      insurance: {
        question: "What does the included travel insurance cover?",
        answer:
          "Gold and Platinum passes include Group Personal Accident Insurance underwritten by Tokio Marine Insurans (Malaysia) Berhad — up to MYR 50,000 for accidental death or permanent disablement, and up to MYR 500 for accidental medical expenses, for registered participants aged 30 days to 75 years while in Malaysia.",
      },
      claim: {
        question: "How do I make an insurance claim?",
        answer:
          "Notify our team within 5 days of the incident via insurance@traveloop.my or WhatsApp +6011-3949 2888, with a completed claim form, medical report, original receipts, and a copy of your ID.",
      },
      isPolicy: {
        question: "Is Traveloop Card a travel insurance policy?",
        answer:
          "No. The Traveloop Card includes Personal Accident and Personal Accident Medical Expense benefits provided through our insurance partner, subject to applicable terms and conditions.",
      },
      children: {
        question: "Can children join the cultural experiences?",
        answer:
          "Yes — children aged 4 or 5 and under (depending on the experience) join free alongside a paying adult.",
      },
      photography: {
        question: "How far ahead do I need to book the Platinum photography session?",
        answer:
          "At least 3 days in advance, subject to photographer and time-slot availability. Sessions run Saturday mornings, 8:30–10:00 AM and 10:00–11:30 AM, around George Town's UNESCO heritage zone.",
      },
    },
  },

  closing: {
    eyebrow: "Ready when you are",
    heading: "Get your Traveloop Pass today.",
    body:
      "Have a question before you choose a tier? Our team can help you pick the " +
      "right pass for your trip.",
    talkToUs: "Talk to us",
    whatsapp: "WhatsApp us",
  },
};

export default passes;
