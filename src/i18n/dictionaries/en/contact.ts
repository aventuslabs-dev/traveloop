/** /contact — the enquiry form and the ways to reach the team. */
const contact = {
  meta: {
    title: "Contact Us",
    description:
      "Questions about a Traveloop Pass, a booking, or partnering with us? Message the Traveloop team in Penang, Malaysia — we reply within one business day.",
    ogTitle: "Contact Traveloop",
    ogDescription:
      "Questions about a Traveloop Pass, a booking, or a partnership? We reply within one business day.",
  },

  hero: {
    eyebrow: "Contact Us",
    headingLead: "We'd love to",
    headingEm: "hear from you.",
    body:
      "Questions about your Traveloop Pass, a partner enquiry, or need help " +
      "planning your trip? Reach out and our team will get back to you shortly.",
  },

  cards: {
    whatsappTitle: "Chat on WhatsApp",
    emailTitle: "Email us",
    responseTitle: "Response time",
    responseValue: "We reply within 1 business day",
    basedTitle: "Based in",
    basedValue: "Penang, Malaysia",
    note:
      "Prefer to talk it through? Message us on WhatsApp for the fastest " +
      "response, Monday to Friday, 9am–6pm MYT.",
  },

  /**
   * The value sent to the server is a stable key, never this label — the
   * enquiry email reaches an English-speaking team, and the validation list
   * must not change meaning when the visitor switches language.
   */
  subjects: {
    general: "General enquiry",
    pricing: "Pass & pricing",
    partner: "Partner with us",
    booking: "Booking support",
  },

  form: {
    name: "Name",
    namePlaceholder: "Your name",
    email: "Email",
    emailPlaceholder: "you@example.com",
    subject: "Subject",
    message: "Message",
    messagePlaceholder: "How can we help?",
    send: "Send Message",
    sending: "Sending…",
    successTitle: "Message sent!",
    successBody:
      "Thanks for reaching out — our team will get back to you within one business day.",
    /** `{pass}` is the tier name from ?pass=, e.g. "gold". */
    passPrefill:
      "Hi, I'm interested in the {pass} Pass. Could you tell me more about how to purchase it?",
  },

  errors: {
    missing: "Please fill in your name, email and message.",
    email: "That email address doesn't look right.",
    tooLong: "That message is too long — please shorten it and try again.",
    sendFailed:
      "We couldn't send your message just now. Please email hello@traveloop.my or message us on WhatsApp.",
  },
};

export default contact;
