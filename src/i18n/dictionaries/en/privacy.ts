import type { LegalSection } from "../../legal";

/**
 * /privacy
 *
 * Written against what the code actually collects, not a template: every
 * field named below exists in `PassRegistration` (src/lib/registration.ts),
 * in a Supabase column, or in a Stripe Checkout Session. When a form gains a
 * field or a processor is swapped out, this file is part of that change —
 * a policy that describes yesterday's data flow is worse than none, because
 * it is a written statement that is no longer true.
 *
 * Section `id`s are anchors and must stay identical in every locale — someone
 * sent /cn/privacy#your-rights has to land on the rights section.
 *
 * NOTE FOR REVIEW: this is an accurate description of the system, but it has
 * not been reviewed by a lawyer. Malaysia's PDPA 2010 was amended in 2024
 * (in force 2025) to add breach notification and a data protection officer
 * requirement above certain thresholds; whether Traveloop crosses those, and
 * the wording of section 9, should be signed off before launch.
 */
const privacy = {
  meta: {
    title: "Privacy Policy",
    description:
      "How Traveloop collects, uses, shares and protects your personal data, and the rights you have over it under Malaysia's Personal Data Protection Act 2010.",
  },

  hero: {
    eyebrow: "Legal",
    headingLead: "Privacy",
    headingEm: "Policy.",
    body:
      "This policy explains what personal data Traveloop collects when you buy a pass, " +
      "book an experience or contact us, why we hold it, who we share it with, and how " +
      "you can get it corrected or deleted.",
    /** `{date}` is filled from the shared LAST_UPDATED constant. */
    lastUpdated: "Last updated: {date}",
    prevailing:
      "This English version is the definitive text. Where a translation differs from it, this version governs.",
  },

  tocTitle: "On this page",
  tocLabel: "On this page",

  /**
   * No `contact` card. Unlike /terms, this document carries the address in
   * its own text — section 1 names it as the data-enquiries contact, and
   * section 10 repeats it next to the 21-day response commitment, which is
   * where someone actually making a request will be reading.
   */

  sections: [
    {
      id: "who-we-are",
      label: "1. Who we are",
      heading: "1. Who we are",
      blocks: [
        {
          type: "p",
          text:
            "Traveloop is operated by Seni Mega Venture Sdn Bhd. We are the data user " +
            "responsible for the personal data described in this policy, and we handle it " +
            "in accordance with Malaysia's Personal Data Protection Act 2010 (PDPA).",
        },
        {
          type: "dl",
          items: [
            {
              term: "Data user",
              text: "Seni Mega Venture Sdn Bhd, registered with the Companies Commission of Malaysia",
            },
            {
              term: "Business address",
              text: "50, Jalan Khaw Sim Bee, 10400 Pulau Pinang, Malaysia",
            },
            {
              term: "Data enquiries",
              text: "traveloop@3d-group.com.my",
              href: "mailto:traveloop@3d-group.com.my",
            },
          ],
        },
        {
          type: "p",
          text:
            "This policy covers traveloop.my and every service reached through it: pass " +
            "purchases, the customer portal, experience bookings, the contact form and the " +
            "Urban Sprint campaign. It does not cover the partner merchants, experience " +
            "operators or insurers you deal with through us, each of whom handles your data " +
            "under their own policy.",
        },
      ],
    },

    {
      id: "what-we-collect",
      label: "2. What we collect",
      heading: "2. What we collect",
      blocks: [
        {
          type: "p",
          text:
            "We collect only what a given service needs. What that is depends on what you do:",
        },

        { type: "h3", text: "When you buy a pass" },
        {
          type: "p",
          text:
            "Before payment, the registration form asks for the details a pass and its " +
            "bundled insurance require. One set is collected per pass, so buying for other " +
            "people means giving us their details too — please make sure they have agreed.",
        },
        {
          type: "ul",
          items: [
            "Full name",
            "Nationality",
            "Arrival and departure dates",
            "Travel document type and number — passport, national ID or residence permit",
            "Address",
            "Emergency contact name, phone number and relationship to you (optional)",
            "The date and time you accepted the participant declaration",
          ],
        },
        {
          type: "p",
          text:
            "Your email address, name and phone number are collected by Stripe on the " +
            "checkout page rather than by our form, and passed to us once payment completes.",
        },

        { type: "h3", text: "When you pay" },
        {
          type: "p",
          text:
            "Card and bank details are entered on Stripe's own hosted checkout page and are " +
            "never sent to, seen by or stored on Traveloop's systems. What we keep is the " +
            "record of the transaction:",
        },
        {
          type: "ul",
          items: [
            "Amount, currency and the passes bought",
            "Stripe's checkout session and payment reference",
            "Our invoice number",
            "Whether the payment succeeded, failed or was abandoned — including the reason a payment was declined, so we can tell you what went wrong",
          ],
        },

        { type: "h3", text: "When you have a Traveloop account" },
        {
          type: "p",
          text:
            "Buying a pass creates a customer portal account for the email address you paid " +
            "with. It holds your email address, your password in hashed form, your purchase " +
            "history, and the registration details above so you do not have to type them " +
            "again. We cannot see your password.",
        },

        { type: "h3", text: "When you book an experience" },
        {
          type: "ul",
          items: [
            "The experience, date, time, location and package you chose",
            "How many people are coming, and how many of them are children",
            "Any notes you add for the operator",
            "The booking reference and its status",
          ],
        },

        { type: "h3", text: "When you use the contact form" },
        {
          type: "p",
          text:
            "Your name, email address, the subject you picked and your message. These reach " +
            "us as an email and are kept in that inbox — they are not stored in a database.",
        },

        { type: "h3", text: "When you take part in Urban Sprint" },
        {
          type: "p",
          text:
            "A display name, a phone number, your role in the campaign, your team, and the " +
            "stations your team completed with the times and points awarded. Team names and " +
            "scores appear on a public leaderboard; phone numbers never do.",
        },

        { type: "h3", text: "Automatically, when you visit" },
        {
          type: "p",
          text:
            "Our hosting and database providers keep standard server logs — IP address, " +
            "browser user-agent, the page requested and the time — which we use to keep the " +
            "site running and to investigate abuse or errors. We do not run analytics, " +
            "advertising or cross-site tracking of any kind.",
        },
      ],
    },

    {
      id: "travel-documents",
      label: "3. Travel document details",
      heading: "3. Travel document details",
      blocks: [
        {
          type: "p",
          text:
            "A passport or identity document number is sensitive, and we want to be direct " +
            "about why we ask for one. It is required to issue the travel insurance bundled " +
            "with a pass, to identify you if a claim is made under that policy, and for " +
            "partner venues to confirm that the person presenting a pass is the person it " +
            "was issued to.",
        },
        {
          type: "p",
          text:
            "We do not ask you to upload a scan or a photograph of the document itself, and " +
            "you should not send us one. The number is visible only to Traveloop staff " +
            "administering your order and to the insurer if you make a claim; it is never " +
            "shown to partner merchants, never included in marketing, and never sold.",
        },
      ],
    },

    {
      id: "how-we-use",
      label: "4. How we use it",
      heading: "4. How we use it",
      blocks: [
        { type: "p", text: "We use your personal data to:" },
        {
          type: "ol",
          items: [
            {
              lead: "Provide what you bought.",
              text:
                "Process your payment, issue your pass and invoice, register you for the " +
                "bundled insurance, confirm your experience bookings with the operator, and " +
                "give you a portal to see it all in.",
            },
            {
              lead: "Contact you about your order.",
              text:
                "Send your confirmation email and invoice, your account details, booking " +
                "confirmations and changes, and answer what you write to us. These are " +
                "service messages, not marketing, and you cannot unsubscribe from them while " +
                "an order is live.",
            },
            {
              lead: "Support and resolve problems.",
              text:
                "Look into a failed payment, a disputed charge, a cancelled booking or an " +
                "insurance claim.",
            },
            {
              lead: "Meet our legal obligations.",
              text:
                "Keep the accounting and tax records Malaysian law requires, and respond to " +
                "lawful requests from authorities.",
            },
            {
              lead: "Keep the service safe.",
              text:
                "Detect fraudulent transactions and abuse, and diagnose faults.",
            },
          ],
        },
        {
          type: "p",
          text:
            "We do not send marketing email, and we do not sell, rent or trade personal " +
            "data to anyone. If we ever want to send you offers, we will ask you first and " +
            "you will be able to say no without losing anything you have paid for.",
        },
        {
          type: "p",
          text:
            "Most of the data above we process because it is necessary to perform the " +
            "contract you entered into when you bought a pass or made a booking. Where that " +
            "is not the basis — the optional emergency contact, for instance — we rely on " +
            "the consent you give by choosing to provide it, which you can withdraw.",
        },
        {
          type: "p",
          text:
            "Supplying the fields marked as required is a condition of buying a pass: " +
            "without them we cannot issue the pass or its insurance, and the purchase " +
            "cannot proceed.",
        },
      ],
    },

    {
      id: "sharing",
      label: "5. Who we share it with",
      heading: "5. Who we share it with",
      blocks: [
        {
          type: "p",
          text:
            "We share personal data only with the parties below, only to the extent each " +
            "needs it, and only for the purposes in section 4.",
        },
        {
          type: "dl",
          items: [
            {
              term: "Stripe",
              text:
                "Payment processing. Collects and holds your card details, name, email and phone; receives the amount and description of what you bought.",
              href: "https://stripe.com/privacy",
            },
            {
              term: "Supabase",
              text:
                "Database and account authentication. Stores your order records, registration details, bookings and login credentials.",
              href: "https://supabase.com/privacy",
            },
            {
              term: "Resend",
              text:
                "Email delivery. Receives your email address and the contents of confirmations, invoices and account emails we send you.",
              href: "https://resend.com/legal/privacy-policy",
            },
            {
              term: "Vercel",
              text:
                "Website hosting. Handles every request to the site and keeps the server logs described in section 2.",
              href: "https://vercel.com/legal/privacy-policy",
            },
            {
              term: "Insurers",
              text:
                "The underwriter of the travel insurance bundled with your pass, who receives the details needed to register your cover and assess any claim you make.",
            },
            {
              term: "Partner merchants and experience operators",
              text:
                "Only your name and booking details, so they can recognise you and hold your place. They do not receive your travel document number, address or emergency contact.",
            },
          ],
        },
        {
          type: "p",
          text:
            "We may also disclose personal data where the law requires it, to a regulator " +
            "or court, to establish or defend a legal claim, or to prevent fraud. If " +
            "Traveloop is ever sold or restructured, data may transfer to the acquirer, who " +
            "would be bound by this policy until you are told otherwise.",
        },
      ],
    },

    {
      id: "international",
      label: "6. Where your data is held",
      heading: "6. Where your data is held",
      blocks: [
        {
          type: "p",
          text:
            "Our database is hosted in Mumbai, India, and the site is served from a global " +
            "content network with its closest edge in Singapore. Your personal data is " +
            "therefore stored and processed outside Malaysia. The processors named in " +
            "section 5 operate internationally and may process data in the United States " +
            "and the European Union.",
        },
        {
          type: "p",
          text:
            "By using Traveloop you consent to that transfer. Each of these providers is " +
            "engaged under terms that require them to protect your data to a standard " +
            "comparable to the PDPA and to process it only on our instructions.",
        },
      ],
    },

    {
      id: "cookies",
      label: "7. Cookies and local storage",
      heading: "7. Cookies and local storage",
      blocks: [
        {
          type: "p",
          text:
            "We set only what the site needs to function. There are no advertising cookies, " +
            "no analytics, and nothing that follows you to other websites — which is why you " +
            "see a short notice rather than a consent wall with a reject button that would " +
            "change nothing.",
        },
        {
          type: "dl",
          items: [
            {
              term: "NEXT_LOCALE",
              text:
                "Remembers whether you chose English or Chinese, so you are not sent back to the default language on every visit. Expires after one year.",
            },
            {
              term: "Supabase session cookies",
              text:
                "Set only when you sign in to the customer portal, the admin console or Urban Sprint. They keep you signed in and are cleared when you sign out.",
            },
            {
              term: "traveloop:cookie-notice-ack",
              text:
                "Stored in your browser, not sent to us. Records that you have seen the cookie notice so it is not shown again.",
            },
          ],
        },
        {
          type: "p",
          text:
            "You can clear or block these in your browser settings. Blocking the session " +
            "cookies will stop you from signing in; blocking the others only means the site " +
            "forgets your language and shows the notice again.",
        },
        {
          type: "p",
          text:
            "If we ever add analytics, this section and the notice will change first: those " +
            "scripts will not load until you have actively chosen to allow them.",
        },
      ],
    },

    {
      id: "retention",
      label: "8. How long we keep it",
      heading: "8. How long we keep it",
      blocks: [
        {
          type: "ul",
          items: [
            "Order and invoice records, including the registration details attached to them: seven years from the date of purchase, which is the retention period Malaysian tax and company law requires of us.",
            "Your customer portal account and profile: for as long as the account exists. Ask us to close it and we delete the account and profile, keeping only the order records above.",
            "Experience bookings: two years after the session date, so we can deal with disputes and repeat visits.",
            "Failed and abandoned payment attempts: 12 months, then deleted.",
            "Incomplete checkouts you never paid for: deleted automatically, and in any case within 30 days.",
            "Contact form enquiries: two years in our inbox from your last message on the subject.",
            "Urban Sprint participant records: deleted within 90 days of the campaign ending. Team names and final scores may stay published as a result.",
            "Server logs: as long as our hosting and database providers retain them, typically no more than 30 days.",
          ],
        },
        {
          type: "p",
          text:
            "When a retention period ends, data is deleted or irreversibly anonymised. We " +
            "may keep something longer where an open dispute, claim or legal obligation " +
            "requires it, and only for as long as that lasts.",
        },
      ],
    },

    {
      id: "security",
      label: "9. How we protect it",
      heading: "9. How we protect it",
      blocks: [
        {
          type: "ul",
          items: [
            "Every page and form is served over HTTPS; data in transit is encrypted.",
            "Passwords are hashed by Supabase Auth. Neither we nor anyone with database access can read them.",
            "Card details never touch our systems — Stripe handles them on its own PCI-DSS compliant infrastructure.",
            "Database tables enforce row-level security, so a signed-in customer can read their own orders and profile and nothing else.",
            "The keys that bypass those rules exist only on the server and are never sent to your browser.",
            "The admin console is restricted to a single authorised account and is excluded from search engines.",
          ],
        },
        {
          type: "p",
          text:
            "No system is perfectly secure, and we will not pretend otherwise. If a breach " +
            "occurs that is likely to cause you significant harm, we will notify you and the " +
            "Personal Data Protection Commissioner as the PDPA requires.",
        },
      ],
    },

    {
      id: "your-rights",
      label: "10. Your rights",
      heading: "10. Your rights",
      blocks: [
        { type: "p", text: "Under the PDPA you have the right to:" },
        {
          type: "ol",
          items: [
            {
              lead: "Access your data.",
              text:
                "Ask for a copy of the personal data we hold about you. Most of it you can " +
                "see immediately by signing in to the customer portal.",
            },
            {
              lead: "Correct it.",
              text:
                "Have inaccurate or incomplete data put right. You can edit your own profile " +
                "in the portal, or ask us.",
            },
            {
              lead: "Withdraw your consent.",
              text:
                "Withdraw consent for any processing that relies on it. This does not affect " +
                "processing already carried out, and it may mean we can no longer provide " +
                "part of the service.",
            },
            {
              lead: "Limit how we process it.",
              text:
                "Ask us to stop processing your data for a particular purpose, or in a way " +
                "that causes you distress.",
            },
            {
              lead: "Ask us to delete it.",
              text:
                "Have data erased once we no longer have a legal reason to keep it. Where a " +
                "retention period in section 8 still applies, we will tell you which one and " +
                "when it ends.",
            },
            {
              lead: "Complain.",
              text:
                "Raise a complaint with the Personal Data Protection Commissioner of " +
                "Malaysia if you believe we have mishandled your data. We would rather you " +
                "came to us first, but it is your right either way.",
            },
          ],
        },
        {
          type: "p",
          text:
            "To exercise any of these, email us at traveloop@3d-group.com.my from the " +
            "address on your order, or write to the business address in section 1. We may " +
            "ask you to confirm your identity before acting — that check protects you, not " +
            "us. We respond within 21 days. There is no charge, unless a request is " +
            "repetitive or excessive, in which case we will tell you the fee before doing " +
            "any work.",
        },
      ],
    },

    {
      id: "children",
      label: "11. Children",
      heading: "11. Children",
      blocks: [
        {
          type: "p",
          text:
            "Traveloop is not directed at children, and we do not knowingly collect personal " +
            "data from anyone under 18. Passes and bookings must be made by an adult, who is " +
            "responsible for any child travelling with them.",
        },
        {
          type: "p",
          text:
            "Where a booking records how many children are in your party, that is a count " +
            "for the operator's planning — we do not ask for their names, ages or documents. " +
            "If you believe a child has given us personal data, tell us and we will delete it.",
        },
      ],
    },

    {
      id: "changes",
      label: "12. Changes to this policy",
      heading: "12. Changes to this policy",
      blocks: [
        {
          type: "p",
          text:
            "We update this policy when what we do with your data changes. The date at the " +
            "top of the page always shows the current version, and the previous one stops " +
            "applying from that date.",
        },
        {
          type: "p",
          text:
            "If a change materially affects your rights — a new category of data, a new " +
            "recipient, a longer retention period — we will tell customers with an active " +
            "account by email rather than relying on you to re-read this page.",
        },
      ],
    },
  ] satisfies LegalSection[] as LegalSection[],
};

export default privacy;
