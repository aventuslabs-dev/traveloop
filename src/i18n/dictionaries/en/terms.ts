import type { LegalSection } from "../../legal";

/**
 * /terms
 *
 * Section `id`s are anchors and must stay identical in every locale — a
 * customer sent /cn/terms#refunds has to land on the refund section.
 */
const terms = {
  meta: {
    title: "Terms of Service",
    description:
      "The terms and conditions, health, refund, cancellation, payment and billing policies that apply to Traveloop services.",
  },

  hero: {
    eyebrow: "Legal",
    headingLead: "Terms of",
    headingEm: "Service.",
    body:
      "Welcome to Traveloop. By accessing or using our website, you agree to the " +
      "following terms and conditions. Please read them carefully before using our services.",
    /** `{date}` is filled from the shared LAST_UPDATED constant. */
    lastUpdated: "Last updated: {date}",
    /**
     * Shown on both locales. A translated contract needs a governing-language
     * clause, or the two versions are equally binding and any difference
     * between them becomes an argument.
     */
    prevailing:
      "This English version is the definitive text. Where a translation differs from it, this version governs.",
  },

  tocTitle: "On this page",
  tocLabel: "On this page",

  contact: {
    heading: "Questions about these terms?",
    /** Rendered around the email and phone links. */
    bodyBefore: "Contact us at ",
    bodyMiddle: " or call ",
    bodyAfter: ".",
  },

  sections: [
    {
      id: "website-terms",
      label: "1. Website Terms and Conditions",
      heading: "1. Website Terms and Conditions",
      blocks: [
        {
          type: "p",
          text:
            "Welcome to the Traveloop website. By accessing or using this website, you " +
            "agree to comply with and be bound by these Terms and Conditions. If you do " +
            "not agree with these Terms, you must discontinue use of the website " +
            "immediately. These Terms are governed by the laws of Malaysia.",
        },
        { type: "h3", text: "Company information" },
        {
          type: "dl",
          items: [
            {
              term: "Website owner",
              text: "Seni Mega Venture Sdn Bhd, registered with the Companies Commission of Malaysia",
            },
            {
              term: "Business address",
              text: "50, Jalan Khaw Sim Bee, 10400 Pulau Pinang, Malaysia",
            },
            {
              term: "Email",
              text: "traveloop@3d-group.com.my",
              href: "mailto:traveloop@3d-group.com.my",
            },
          ],
        },
        { type: "h3", text: "Services" },
        {
          type: "p",
          text:
            "Traveloop provides tourism-related services, including but not limited to " +
            "travel passes, curated local experiences, tourist SIM cards, travel insurance " +
            "and related travel products.",
        },
        { type: "h3", text: "Website usage" },
        { type: "p", text: "Users agree that they will not:" },
        {
          type: "ul",
          items: [
            "Use the website for unlawful purposes",
            "Attempt to gain unauthorized access to website systems",
            "Transmit harmful software or malicious code",
            "Engage in fraudulent transactions",
          ],
        },
        {
          type: "p",
          text:
            "Traveloop reserves the right to restrict or terminate access to users who " +
            "violate these terms.",
        },
        { type: "h3", text: "Intellectual property" },
        { type: "p", text: "All content on the website, including:" },
        { type: "ul", items: ["Logos", "Graphics", "Text", "Images", "Software"] },
        {
          type: "p",
          text:
            "is the intellectual property of Traveloop unless otherwise stated. Users may " +
            "not reproduce, distribute, or modify any website content without written permission.",
        },
        { type: "h3", text: "Pricing and payments" },
        { type: "p", text: "All prices listed on the website:" },
        {
          type: "ul",
          items: [
            "Are displayed in Malaysian Ringgit (MYR), unless otherwise stated. Prices may change without prior notice due to exchange rates",
            "Include applicable taxes where required",
          ],
        },
        {
          type: "p",
          text:
            "Payments are processed securely through third-party payment processors " +
            "including Stripe. Traveloop does not store customer payment card information.",
        },
        { type: "h3", text: "Limitation of liability" },
        { type: "p", text: "Traveloop shall not be liable for:" },
        {
          type: "ul",
          items: [
            "Travel disruptions beyond its control",
            "Third-party service failures",
            "Losses caused by inaccurate user information",
          ],
        },
        { type: "p", text: "Users agree that they use the website at their own risk." },
        { type: "h3", text: "Third-party services" },
        {
          type: "p",
          text:
            "Certain services offered through the website may involve third-party " +
            "providers such as:",
        },
        {
          type: "ul",
          items: [
            "Insurance companies",
            "Telecommunications providers",
            "Tourism partners",
          ],
        },
        {
          type: "p",
          text:
            "Traveloop is not responsible for the policies or actions of third-party providers.",
        },
        { type: "h3", text: "Governing law" },
        {
          type: "p",
          text: "These Terms shall be governed by the laws of Malaysia, including the:",
        },
        {
          type: "ul",
          items: ["Consumer Protection Act 1999", "Electronic Commerce Act 2006"],
        },
      ],
    },
    {
      id: "health",
      label: "2. Health and Appointment Policy",
      heading: "2. Health and Appointment Policy",
      blocks: [
        {
          type: "p",
          text:
            "At Traveloop, we prioritise the health, safety, and well-being of all our " +
            "clients and staff. To maintain a safe and responsible environment, the " +
            "following policy applies:",
        },
        {
          type: "ol",
          items: [
            {
              lead: "Health disclosure requirement.",
              text:
                "Any client who has been diagnosed with any form of illness or medical " +
                "condition is required to take appropriate action regarding their booking " +
                "or appointment.",
            },
            {
              lead: "Cancellation or rescheduling.",
              text:
                "Clients who receive a diagnosis after making a booking must cancel or " +
                "reschedule their appointment immediately. Clients who are aware of a " +
                "medical condition before making a booking must refrain from proceeding " +
                "with the booking until they have fully recovered or have received " +
                "appropriate medical clearance.",
            },
            {
              lead: "Resumption of services.",
              text:
                "Clients may proceed with booking or attending appointments only after " +
                "they have been properly treated and are medically fit, where applicable.",
            },
            {
              lead: "Responsibility and compliance.",
              text:
                "It is the responsibility of each client to comply with this policy in " +
                "order to ensure a safe experience for everyone. Traveloop reserves the " +
                "right to refuse or postpone services if a client appears unwell or fails " +
                "to adhere to this policy.",
            },
          ],
        },
      ],
    },
    {
      id: "refunds",
      label: "3. Refund and Cancellation Policy",
      heading: "3. Refund and Cancellation Policy",
      blocks: [
        { type: "h3", text: "Overview" },
        {
          type: "p",
          text:
            "Traveloop aims to provide a fair and transparent refund policy for all " +
            "tourism services purchased through the website.",
        },
        { type: "h3", text: "Cancellation by customer" },
        {
          type: "p",
          text:
            "Customers may cancel bookings for personal reasons, but no refund is " +
            "available for any cancellation after payment.",
        },
        { type: "h3", text: "Non-refundable items" },
        { type: "p", text: "The following items may not be refundable:" },
        {
          type: "ul",
          items: [
            "Activated tourist SIM cards",
            "Digital vouchers already used",
            "Completed tourism experiences",
            "Insurance policies once issued",
          ],
        },
        { type: "h3", text: "Cancellation by Traveloop" },
        { type: "p", text: "Traveloop may cancel services due to:" },
        {
          type: "ul",
          items: ["Weather conditions", "Safety concerns", "Operational issues"],
        },
        { type: "p", text: "If this occurs, customers will receive either:" },
        {
          type: "ul",
          items: [
            "A full refund",
            "A rescheduling option",
            "An alternative service of equal value",
          ],
        },
        { type: "h3", text: "Refund processing" },
        {
          type: "p",
          text:
            "Approved refunds will be processed through the original payment method used " +
            "during purchase. Payment processors such as Stripe may take 5–10 business " +
            "days to complete the refund.",
        },
        { type: "h3", text: "Chargebacks" },
        {
          type: "p",
          text:
            "Customers are encouraged to contact Traveloop support before initiating " +
            "payment disputes with their bank or card provider. Fraudulent chargebacks " +
            "may result in account suspension.",
        },
      ],
    },
    {
      id: "payments",
      label: "4. Payment and Billing Policy",
      heading: "4. Payment and Billing Policy",
      blocks: [
        { type: "h3", text: "Accepted payment methods" },
        {
          type: "p",
          text: "Traveloop accepts payments through secure payment systems including:",
        },
        {
          type: "ul",
          items: ["Credit cards", "Debit cards", "International card payments"],
        },
        { type: "p", text: "Payments are processed through Stripe." },
        { type: "h3", text: "Currency" },
        {
          type: "p",
          text:
            "All transactions are processed in Malaysian Ringgit (MYR). International " +
            "customers may be charged currency conversion fees by their banks.",
        },
        { type: "h3", text: "Payment security" },
        { type: "p", text: "Traveloop uses industry-standard security protocols including:" },
        {
          type: "ul",
          items: ["SSL encryption", "Secure payment gateways", "Fraud detection systems"],
        },
        {
          type: "p",
          text:
            "Sensitive payment information is handled exclusively by the payment " +
            "processor and is not stored on the website.",
        },
        { type: "h3", text: "Billing information" },
        { type: "p", text: "Customers must provide accurate billing information including:" },
        {
          type: "ul",
          items: ["Full name", "Billing address", "Email address", "Contact phone number"],
        },
        { type: "p", text: "Incorrect billing details may cause payment or refund failure." },
        { type: "h3", text: "Transaction confirmation" },
        { type: "p", text: "After successful payment, customers will receive:" },
        {
          type: "ul",
          items: ["An email confirmation", "Booking details", "A receipt or invoice"],
        },
        { type: "h3", text: "Fraud prevention" },
        { type: "p", text: "Traveloop reserves the right to:" },
        {
          type: "ul",
          items: [
            "Verify suspicious transactions",
            "Request additional identification",
            "Cancel fraudulent bookings",
          ],
        },
        { type: "h3", text: "Taxes" },
        {
          type: "p",
          text:
            "Where applicable, transactions may include taxes required by Malaysian law. " +
            "This includes potential obligations under the sales and service tax.",
        },
      ],
    },
  ] satisfies LegalSection[] as LegalSection[],
};

export default terms;
