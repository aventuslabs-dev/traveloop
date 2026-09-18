/**
 * The tourist-registration details collected before checkout.
 *
 * Deliberately excludes email and phone: Stripe Checkout collects both
 * (`phone_number_collection` is enabled on the session) and fulfilment reads
 * them off `session.customer_details`, so asking twice would only risk the
 * two disagreeing.
 */
export type PassRegistration = {
  fullName: string;
  nationality: string;
  arrivalDate: string;
  departureDate: string;
  travelDocumentType: string;
  travelDocumentNumber: string;
  address: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  /** ISO timestamp of when the participant declaration was ticked. */
  termsAcceptedAt: string;
};

export const NATIONALITIES = [
  "Afghan", "Albanian", "Algerian", "American", "Argentine", "Australian",
  "Austrian", "Bangladeshi", "Belgian", "Brazilian", "British", "Bulgarian",
  "Canadian", "Chinese", "Colombian", "Croatian", "Czech", "Danish", "Dutch",
  "Egyptian", "Finnish", "French", "German", "Greek", "Indian", "Indonesian",
  "Irish", "Italian", "Japanese", "Kenyan", "Malaysian", "Mexican", "Moroccan",
  "Nepalese", "New Zealander", "Nigerian", "Norwegian", "Pakistani",
  "Philippine", "Polish", "Portuguese", "Romanian", "Russian", "Saudi",
  "Singaporean", "South African", "South Korean", "Spanish", "Swedish",
  "Swiss", "Thai", "Turkish", "Ukrainian", "Vietnamese", "Other",
] as const;

export const DOCUMENT_TYPES = ["Passport", "National ID", "Residence Permit", "Other"] as const;

export const EMERGENCY_RELATIONSHIPS = [
  "Parent", "Sibling", "Spouse/Partner", "Friend", "Colleague", "Other",
] as const;

/** Sanity cap on free-text fields — long enough for any real answer. */
const MAX_FIELD_LENGTH = 500;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown): string | null {
  const cleaned = cleanString(value);
  return cleaned === "" ? null : cleaned.slice(0, MAX_FIELD_LENGTH);
}

/**
 * The fields this validator can complain about. The key is what travels; the
 * reader-facing name for it lives in each locale's dictionary, because
 * "address" has to become "地址" for a buyer on /cn.
 */
export type RegistrationField =
  | "fullName"
  | "nationality"
  | "arrivalDate"
  | "departureDate"
  | "travelDocumentType"
  | "travelDocumentNumber"
  | "address";

/**
 * Why a registration was rejected, as a key plus whatever the sentence needs
 * to name — never as a finished English sentence.
 *
 * This module runs on the server for a form that exists in two languages, so
 * it cannot know which words the buyer reads. The caller translates, at the
 * point where the locale is known (see `api/checkout/route.ts`). Returning
 * English from here is how a Chinese shopper used to hit "Please provide your
 * address." at the exact moment they were trying to pay.
 */
export type RegistrationError =
  | { key: "detailsRequired" }
  | { key: "missingField"; field: RegistrationField }
  | { key: "fieldTooLong"; field: RegistrationField }
  | { key: "invalidArrivalDate" }
  | { key: "invalidDepartureDate" }
  | { key: "dateOrder" }
  | { key: "termsNotAccepted" };

export type ParseResult =
  | { ok: true; value: PassRegistration }
  | { ok: false; error: RegistrationError };

/**
 * Validates a registration submitted by the browser. The client validates too,
 * but this is the authoritative check — the browser can post anything.
 */
export function parseRegistration(input: unknown): ParseResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: { key: "detailsRequired" } };
  }

  const raw = input as Record<string, unknown>;

  const fullName = cleanString(raw.fullName);
  const nationality = cleanString(raw.nationality);
  const arrivalDate = cleanString(raw.arrivalDate);
  const departureDate = cleanString(raw.departureDate);
  const travelDocumentType = cleanString(raw.travelDocumentType);
  const travelDocumentNumber = cleanString(raw.travelDocumentNumber);
  const address = cleanString(raw.address);

  const required: [RegistrationField, string][] = [
    ["fullName", fullName],
    ["nationality", nationality],
    ["arrivalDate", arrivalDate],
    ["departureDate", departureDate],
    ["travelDocumentType", travelDocumentType],
    ["travelDocumentNumber", travelDocumentNumber],
    ["address", address],
  ];

  for (const [field, value] of required) {
    if (!value) return { ok: false, error: { key: "missingField", field } };
    if (value.length > MAX_FIELD_LENGTH) {
      return { ok: false, error: { key: "fieldTooLong", field } };
    }
  }

  if (!ISO_DATE.test(arrivalDate) || Number.isNaN(Date.parse(arrivalDate))) {
    return { ok: false, error: { key: "invalidArrivalDate" } };
  }
  if (!ISO_DATE.test(departureDate) || Number.isNaN(Date.parse(departureDate))) {
    return { ok: false, error: { key: "invalidDepartureDate" } };
  }
  if (Date.parse(departureDate) < Date.parse(arrivalDate)) {
    return { ok: false, error: { key: "dateOrder" } };
  }

  if (raw.termsAccepted !== true) {
    return { ok: false, error: { key: "termsNotAccepted" } };
  }

  return {
    ok: true,
    value: {
      fullName,
      nationality,
      arrivalDate,
      departureDate,
      travelDocumentType,
      travelDocumentNumber,
      address,
      emergencyContactName: optionalString(raw.emergencyContactName),
      emergencyContactPhone: optionalString(raw.emergencyContactPhone),
      emergencyContactRelationship: optionalString(raw.emergencyContactRelationship),
      termsAcceptedAt: new Date().toISOString(),
    },
  };
}

