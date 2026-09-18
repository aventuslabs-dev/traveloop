import type { InsuranceDoc } from "@/i18n/legal";

/**
 * Traveloop's insurance Terms & Conditions — the document a buyer must accept
 * at step 3 of the purchase flow, before Stripe ever sees them.
 *
 * Held as data rather than JSX because it is a contract that now exists in two
 * languages: the English and Chinese files sit side by side with the same
 * shape, so a missing clause is a type error rather than something nobody
 * notices until a claim is refused. `InsuranceTerms.tsx` is the renderer.
 *
 * Clause numbers are NOT written here — they come from the array order, so the
 * two languages cannot disagree about what "clause 7" is.
 *
 * Substantive wording changes belong to the insurer, not to a translator: edit
 * this file and `../cn/insurance.ts` in the same commit, or the versions drift
 * apart and the Chinese one stops describing the policy that was actually
 * bought.
 */

/** Repeated verbatim in "Claim Procedure" and "Claim Notification". */
const CONTACT_METHODS = [
  "Email: insurance@traveloop.my",
  "WhatsApp: +6011-3949-2888",
  "WeChat: Traveloop_MY",
  "Mobile number: +6011-3949-2888",
];

/** Attached to each of the three claim types, identically. */
const TT_PAYMENT_FIELDS = [
  "Beneficiary name",
  "Beneficiary passport no",
  "Beneficiary address (overseas)",
  "Beneficiary account no",
  "Beneficiary Bank's name",
  "Beneficiary bank address",
  "Swift code (e.g. BOTKJPJT)",
  "Currency to be paid (e.g. SGD, USD etc)",
];

const TT_PAYMENT_INTRO = "Information needed for TT payment to overseas:";

const insurance: InsuranceDoc = {
  heading: "Traveloop Insurance Terms & Conditions",
  sub: "(Applicable to Traveloop Cultural Experiences and Participating Activities)",
  governingLanguage: null,

  sections: [
    {
      heading: "Acceptance",
      blocks: [
        {
          type: "p",
          text:
            "By participating in any Traveloop programme, activity or experience, the " +
            "Participant confirms that they have read, understood and agreed to these " +
            "Terms & Conditions.",
        },
      ],
    },

    {
      heading: "Insurance Coverage",
      blocks: [
        {
          type: "p",
          text:
            "Eligible Participants are protected under Traveloop's Group Personal Accident " +
            "Insurance Policy, insured by our partner Tokio Marine Insurans (Malaysia) Berhad " +
            "throughout their participation in registered Traveloop activities within Malaysia, " +
            "subject to the insurer's terms, conditions, exclusions, endorsements and final " +
            "approval.",
        },
        {
          type: "p",
          text:
            "Insurance protection only applies to participants who have been successfully " +
            "registered under Traveloop's monthly declaration list before the commencement of " +
            "the activity.",
        },
      ],
    },

    {
      heading: "Benefits",
      blocks: [
        {
          type: "p",
          text:
            "Subject to approval by the insurer, the policy provides the following maximum " +
            "benefits per insured participant:",
        },
        {
          type: "table",
          columns: ["Benefit", "Maximum Amount"],
          rows: [
            ["Accidental Death", "RM50,000"],
            ["Permanent Disablement", "RM50,000"],
            ["Medical Expenses (Accidental Injury)", "Up to RM500"],
          ],
        },
        {
          type: "p",
          text:
            "Actual reimbursement is subject to the policy terms and the actual medical " +
            "expenses incurred.",
        },
      ],
    },

    {
      heading: "Eligibility",
      blocks: [
        { type: "p", text: "Insurance coverage is available only to participants:" },
        {
          type: "ul",
          items: [
            "aged between 30 days and 75 years;",
            "whose names and identification details have been declared by Traveloop;",
            "participating in officially organised Traveloop activities; and",
            "within the declared coverage period.",
          ],
        },
      ],
    },

    {
      heading: "Geographical Scope",
      blocks: [
        {
          type: "p",
          text: "Insurance coverage is valid only for activities conducted within Malaysia.",
        },
      ],
    },

    {
      heading: "Covered Events",
      blocks: [
        {
          type: "p",
          text:
            "Subject to the policy wording, coverage includes accidental bodily injury " +
            "resulting in:",
        },
        {
          type: "ul",
          items: [
            "Accidental Death",
            "Permanent Disablement",
            "Medical Expenses arising from accidental injury",
          ],
        },
        { type: "p", text: "The policy may also extend to cover accidents arising from:" },
        {
          type: "ul",
          items: [
            "Amateur sports activities",
            "Social and recreational activities",
            "Hijacking",
            "Unprovoked murder or assault",
            "Amateur scuba diving (maximum 50 metres depth)",
            "Amateur mountaineering (exclude use of rope or climbing equipment)",
            "Amateur hunting",
            "Underwater activities (maximum 50 metres depth)",
            "Electrocution",
            "Drowning",
            "Food poisoning",
            "Accidental gas inhalation",
            "Suffocation by smoke, fumes or poisonous gas",
            "Harmful insect bites / Snake bites / Animal bites (excluding diseases transmitted)",
            "Natural catastrophes including flood, windstorm, typhoon, hurricane and volcanic eruption",
            "Kidnapping (excluding terrorism-related incidents)",
          ],
        },
        {
          type: "p",
          text: "Coverage is always subject to the policy terms, exclusions and insurer approval.",
        },
      ],
    },

    {
      heading: "Exclusions",
      blocks: [
        {
          type: "p",
          text:
            "Insurance benefits may not be payable where the loss arises from circumstances " +
            "excluded under the insurance policy, including but not limited to:",
        },
        {
          type: "ul",
          items: [
            "Participation in professional sports or competitions.",
            "Professional scuba diving or diving beyond 50 metres.",
            "Professional mountaineering or hazardous activities not covered by the policy.",
            "Terrorism where specifically excluded.",
            "Diseases transmitted by insects, snakes or animals.",
            "Activities excluded under the insurance policy.",
            "Any event not covered under the insurer's policy wording.",
          ],
        },
        {
          type: "p",
          text:
            "The insurer reserves the right to determine whether any claim falls within the " +
            "policy coverage.",
        },
      ],
    },

    {
      heading: "Claim Procedure",
      blocks: [
        {
          type: "p",
          text:
            "The Participant shall notify Traveloop as soon as reasonably practicable " +
            "following an accident through the below methods:",
        },
        { type: "ul", items: CONTACT_METHODS },
        {
          type: "p",
          text:
            "Insurance claims must be submitted together with the completed Claim Form and " +
            "supporting documents.",
        },

        {
          type: "p",
          lead: "Claims up to RM500",
          text: "— the following documents are required:",
        },
        {
          type: "ul",
          items: [
            "Doctor's Diagnosis.",
            "Original Medical bill/Medical Receipt with Official Stamp and Signature.",
            "Copy of Passport or Malaysian Identity Card (NRIC).",
            "Complete e-payment form.",
          ],
        },
        { type: "p", text: TT_PAYMENT_INTRO },
        { type: "ul", items: TT_PAYMENT_FIELDS },

        {
          type: "p",
          lead: "Permanent Disablement",
          text: "— the following documents are required:",
        },
        {
          type: "ul",
          items: [
            "Copy of Passport or Malaysian Identity Card (NRIC).",
            "Specialist Report confirming the permanent disablement.",
            "Photographs depicting the amputation of the affected limb(s), where applicable.",
            "X-ray and/or MRI reports, if any.",
            "Complete e-payment form.",
          ],
        },
        { type: "p", text: TT_PAYMENT_INTRO },
        { type: "ul", items: TT_PAYMENT_FIELDS },

        {
          type: "p",
          lead: "Accidental Death",
          text: "— the following documents are required:",
        },
        {
          type: "ul",
          items: [
            "Detailed Post-Mortem Report.",
            "Toxicology Report, where applicable.",
            "Death Certificate.",
            "Police Report.",
            "Newspaper cutting of the incident, where applicable.",
            "Burial or Cremation Permit.",
            "Copy of Deceased's Passport or Malaysian Identity Card (NRIC).",
            "Copy of Marriage/Birth Certificate, where applicable.",
            "Letter of Administration/Distribution Order/Sijil Faraid — when there is no Nomination.",
            "Complete e-payment form.",
          ],
        },
        { type: "p", text: TT_PAYMENT_INTRO },
        { type: "ul", items: TT_PAYMENT_FIELDS },

        {
          type: "p",
          text: "Traveloop may request additional documents if required by the insurer.",
        },
      ],
    },

    {
      heading: "Claim Notification",
      blocks: [
        {
          type: "p",
          text: "Claims should be reported to Traveloop via the below methods as soon as possible.",
        },
        { type: "ul", items: CONTACT_METHODS },
        {
          type: "p",
          text:
            "Where applicable under the insurance policy, notification should be made within " +
            "5 days from the date of the accident. Late notification may affect claim " +
            "assessment by the insurer.",
        },
      ],
    },

    {
      heading: "Claim Assessment",
      blocks: [
        {
          type: "ul",
          items: [
            "Submission of a claim does not guarantee payment.",
            "All claims shall be assessed solely by the insurer in accordance with the policy.",
            "The insurer reserves the right to approve, reject or reduce any claim.",
            "Traveloop has no authority to approve or reject insurance claims.",
          ],
        },
      ],
    },

    {
      heading: "Limitation of Liability",
      blocks: [
        {
          type: "p",
          text:
            "Traveloop (Seni Mega Venture Sdn. Bhd.) acts solely as the programme organiser " +
            "and policyholder.",
        },
        {
          type: "p",
          text:
            "Traveloop shall not be liable for any injury, illness, death, loss or damage " +
            "suffered by any participant beyond the benefits payable under the applicable " +
            "insurance policy or where a claim is rejected by the insurer.",
        },
        {
          type: "p",
          text:
            "Traveloop shall not be responsible for any decision made by the insurer " +
            "regarding claim approval, benefit amount or claim settlement.",
        },
      ],
    },

    {
      heading: "Participant Responsibilities",
      blocks: [
        { type: "p", text: "Participants shall:" },
        {
          type: "ul",
          items: [
            "provide true and accurate information;",
            "comply with all safety instructions;",
            "exercise reasonable care during activities;",
            "immediately seek medical treatment following an accident where necessary;",
            "retain all original medical documents and receipts;",
            "cooperate fully with Traveloop and the insurer during claim investigations.",
          ],
        },
        { type: "p", text: "Failure to comply may result in claim rejection." },
      ],
    },

    {
      heading: "Fraudulent Claims",
      blocks: [
        {
          type: "p",
          text:
            "Any false declaration, forged document, fraudulent claim or material " +
            "misrepresentation may result in immediate rejection of the claim and " +
            "cancellation of any entitlement under the insurance policy.",
        },
      ],
    },

    {
      heading: "Force Majeure",
      blocks: [
        {
          type: "p",
          text:
            "Traveloop shall not be liable for cancellation, postponement or interruption of " +
            "activities arising from circumstances beyond its reasonable control, including " +
            "adverse weather, government restrictions, natural disasters, strikes or other " +
            "force majeure events.",
        },
      ],
    },

    {
      heading: "Sanctions",
      blocks: [
        {
          type: "p",
          text:
            "No insurance benefit shall be payable where payment would expose the insurer to " +
            "any sanction, prohibition or restriction imposed under applicable United Nations, " +
            "United States, United Kingdom, European Union or other applicable laws.",
        },
      ],
    },

    {
      heading: "Governing Law",
      blocks: [
        {
          type: "p",
          text:
            "These Terms & Conditions shall be governed by the laws of Malaysia. Any dispute " +
            "shall be subject to the exclusive jurisdiction of the Courts of Malaysia.",
        },
      ],
    },

    {
      heading: "Insurance Claim",
      blocks: [
        {
          type: "p",
          text:
            "Traveloop acts solely as a coordinator to assist and monitor the insurance claim " +
            "process. All claims shall be assessed and processed directly by Tokio Marine " +
            "Insurance (Malaysia) Berhad in accordance with the insurance policy terms and " +
            "conditions.",
        },
        {
          type: "p",
          text:
            "Any approved claim payment shall be made directly by Tokio Marine Insurance " +
            "(Malaysia) Berhad to the eligible injured person or claimant in Ringgit Malaysia " +
            "(MYR). In the event that the insured person has returned to their country of " +
            "residence, Tokio Marine Insurance (Malaysia) Berhad may arrange the payment in " +
            "the applicable foreign currency, subject to Tokio Marine's approval, applicable " +
            "exchange rate determination and internal procedures. Any currency conversion " +
            "shall be handled solely by Tokio Marine Insurance (Malaysia) Berhad.",
        },
        {
          type: "p",
          text:
            "Traveloop shall not be responsible for the assessment, approval, rejection, " +
            "currency exchange rate, currency conversion, processing or payment of any " +
            "insurance claim.",
        },
      ],
    },
  ],
};

export default insurance;
