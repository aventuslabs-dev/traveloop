/** /passes/register and /passes/success — the buy flow. */
const checkout = {
  register: {
    meta: {
      title: "Complete your registration",
      description:
        "Register each traveller and complete your Traveloop Pass purchase.",
    },
    eyebrow: "Your order",
    heading: "Build your order",
    lede:
      "Add a pass for each traveller — everyone in your group needs their own " +
      "tourist registration and insurance details.",
    back: "← Choose a different pass",
  },

  success: {
    meta: {
      title: "Order confirmed",
      description: "Your Traveloop Pass order confirmation.",
    },

    paidEyebrow: "Order confirmed",
    processingEyebrow: "Payment processing",

    /** `{name}` is the buyer's first name, or `fallbackName` when unknown. */
    paidHeadingLead: "Welcome aboard,",
    paidHeadingEm: "{name}.",
    fallbackName: "traveller",

    processingHeadingLead: "Almost there —",
    processingHeadingEm: "confirming your payment.",

    /**
     * `{pass}` is the pass name, already pluralised by the caller.
     * `{email}` is filled with `emailSuffix`, or left empty when unknown.
     */
    paidLede:
      "Your {pass} is confirmed. We've sent a receipt{email}, and your pass " +
      "details will follow by email shortly.",
    paidEmailSuffix: " to {email}",

    processingLede:
      "Your bank hasn't confirmed the transfer yet — this can take a few minutes. " +
      "We'll email you{email} as soon as it clears. There's no need to pay again.",
    processingEmailSuffix: " at {email}",

    /** `{pass}` is the tier name; used when a single pass was bought. */
    singlePassName: "{pass} Pass",

    passLabelOne: "Pass",
    passLabelMany: "Passes",
    total: "Total",
    reference: "Order reference",

    customerPortal: "Customer Portal",
    downloadInvoice: "Download invoice",
    needHelp: "Need help?",

    noteWithReference:
      "Quote your order reference if you contact us about this purchase.",
    noteWithoutReference:
      "Your order reference is on the receipt we email you — quote it if you contact us about this purchase.",

    unavailableEyebrow: "Order status unavailable",
    unavailableHeadingLead: "We couldn't load",
    unavailableHeadingEm: "this order.",
    unavailableLede:
      "If you completed payment, don't worry — it has still gone through, and your " +
      "receipt is on its way by email. Get in touch and we'll confirm the details for you.",
    contactUs: "Contact us",
    backToPasses: "Back to passes",
  },
};

export default checkout;
