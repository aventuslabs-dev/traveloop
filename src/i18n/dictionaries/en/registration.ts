/**
 * The three-step purchase form.
 *
 * The dropdown *values* are not here — they live in `lib/registration.ts` and
 * stay English on the wire. `app/data/cn/registration.ts` supplies the Chinese
 * labels shown against them.
 */
const registration = {
  steps: {
    /** `{n}` / `{total}` are the current and total step numbers. */
    label: "Step {n} of {total}",
  },

  cart: {
    heading: "Choose your passes",
    lede:
      "Add one pass per traveller. Each pass gets its own tourist registration and " +
      "Tokio Marine insurance details.",
    add: "Add",
    empty: "Your cart is empty — add a pass above to get started.",
    remove: "Remove",
    /** `{index}` is the 1-based position, `{tier}` the tier name. */
    lineItem: "{index}. {tier} Pass — MYR {price}",
    /** `{count}` is the number of passes in the cart. */
    totalOne: "Total ({count} pass)",
    totalMany: "Total ({count} passes)",
    continue: "Continue to registration",
  },

  details: {
    /** `{n}` / `{total}` are the registrant number, `{tier}` the tier name. */
    heading: "Registrant {n} of {total} — {tier} Pass",
    lede:
      "Please provide their details to help us ensure a smooth and personalised " +
      "travel experience. We'll collect your email and phone number securely at payment.",
    back: "Back",
    next: "Next registrant",
    toTerms: "Continue to Terms & Conditions",
    dateOrder: "Your departure date must be on or after your arrival date.",
  },

  terms: {
    heading: "Terms & Conditions",
    ledeOne: "Please read and accept the terms below to complete your purchase of {count} pass.",
    ledeMany: "Please read and accept the terms below to complete your purchase of {count} passes.",
    consent:
      "I hereby confirm that I have read, understood and agreed to the Traveloop Terms & " +
      "Conditions and Insurance Terms & Conditions on behalf of every registrant above. I " +
      "acknowledge that participation is voluntary and at each participant's own risk. I " +
      "understand that insurance coverage is subject to the insurer's policy terms, conditions, " +
      "exclusions and final approval, and that Traveloop (Seni Mega Venture Sdn. Bhd.) shall not " +
      "be liable for any claim rejected or reduced by the insurer.",
    back: "Back",
    submit: "Agree & continue to payment",
    redirecting: "Redirecting…",
  },

  fields: {
    fullName: "Full name",
    nationality: "Nationality",
    selectNationality: "Select nationality",
    specifyNationality: "Please specify nationality",
    arrivalDate: "Arrival date",
    departureDate: "Departure date",
    documentType: "Type of travel document",
    selectDocumentType: "Select a document type",
    documentNumber: "Document number",
    address: "Address",
    emergencySection: "Emergency contact (optional)",
    emergencyName: "Emergency contact name",
    emergencyPhone: "Emergency contact phone number",
    emergencyRelationship: "Relationship to emergency contact",
    selectRelationship: "Select a relationship",
    specifyRelationship: "Please specify the relationship",
  },

  errors: {
    checkoutFailed: "We couldn't start checkout. Please try again.",
    network: "Network error. Please check your connection and try again.",
  },
};

export default registration;
