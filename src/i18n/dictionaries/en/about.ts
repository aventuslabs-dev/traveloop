/**
 * /about
 *
 * Headings on this page are split into a plain lead and an emphasised tail
 * (`<em>`), which the design sets in the serif display face. They are kept as
 * two strings rather than one with markup so the break can move — Chinese
 * rarely wants it in the same place English does.
 */
const about = {
  meta: {
    title: "About Us",
    description:
      "Traveloop connects travellers in Malaysia with vetted local partners and authentic cultural experiences. Learn who we are, why we started, and what we stand for.",
    ogDescription:
      "Traveloop connects travellers in Malaysia with vetted local partners and authentic cultural experiences.",
  },

  hero: {
    eyebrow: "About Traveloop",
    headingLead: "Every Journey Begins",
    headingEm: "with a Local Story.",
    body:
      "The heart of Malaysia isn't found on a map — it's found in its people, " +
      "neighbourhoods, traditions, and flavours. Traveloop connects travellers " +
      "with authentic experiences and trusted local partners, making every " +
      "journey richer, easier, and more meaningful.",
  },

  story: {
    eyebrow: "Why we started",
    headingLead: "Because Every Trip",
    headingEm: "Deserves a Story",
    body1:
      "The best memories aren't made from checking places off a list — they come " +
      "from meaningful moments, unexpected discoveries, and genuine local connections.",
    body2:
      "Traveloop was created to make those moments effortless. Every experience, " +
      "partner, and privilege is carefully selected so you can spend less time " +
      "planning and more time experiencing the real Malaysia.",
  },

  values: {
    eyebrow: "Our Values",
    headingLead: "Built around",
    headingEm: "what matters.",
    items: {
      authenticity: {
        title: "Authenticity",
        body: "Genuine cultural experiences shaped by local communities.",
      },
      trust: {
        title: "Trust",
        body: "Every partner is vetted, trusted, and personally chosen.",
      },
      simplicity: {
        title: "Simplicity",
        body: "One pass unlocks everything a traveller could need.",
      },
      memories: {
        title: "Memories",
        body: "Journeys crafted to become stories worth telling.",
      },
    },
  },

  team: {
    heading: "Meet the Team",
    subheading: "The people behind Traveloop.",
    founded: "Founded in 2026",
    /** Placeholder people — replace name, role and bio together when real. */
    placeholderName: "Full Name",
    placeholderBio: "Placeholder bio — add a short line about this person's background.",
    roles: {
      ceo: "Co-Founder & CEO",
      coo: "Co-Founder & COO",
      partnerships: "Head of Partnerships",
      experience: "Head of Experience",
      developer: "Lead Developer",
    },
  },

  closing: {
    heading: "Come experience it with us.",
    body:
      "Every pass we sell funds another local partnership, another artisan " +
      "supported, another traveller connected to the real Malaysia.",
    cta: "Choose your Traveloop Pass",
  },
};

export default about;
