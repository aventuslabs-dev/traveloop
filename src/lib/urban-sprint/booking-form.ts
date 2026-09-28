import { EMERGENCY_RELATIONSHIPS, NATIONALITIES } from "@/lib/registration";
import {
  TEAM_SIZE_MAX,
  TEAM_SIZE_MIN,
  isSlotBookable,
  isSlotTime,
  type SlotTime,
} from "./booking-config";

/**
 * Validation for the team booking form, shared by the browser (so mistakes
 * show against the field that caused them before anything is sent) and the
 * checkout route (which is the check that counts — a request can be posted by
 * anything).
 *
 * The participant fields mirror what the Traveloop Card and its insurance
 * cover are issued against: the name exactly as on the identity document, the
 * document itself, and the nationality it implies. Every racer also gets a
 * Platinum Pass, so each one carries the pass's insurance registration too —
 * the trip it covers, a home address and an optional emergency contact, the
 * same details /passes/register asks a pass buyer for.
 */

export type DocumentType = "mykad" | "passport";
export type Sex = "male" | "female";

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  mykad: "Malaysian IC (MyKad)",
  passport: "Passport",
};

export const SEX_LABEL: Record<Sex, string> = {
  male: "Male",
  female: "Female",
};

/** Nationalities offered for passport holders — the Traveloop registration list. */
export const BOOKING_NATIONALITIES = NATIONALITIES;

/** Relationships offered for the emergency contact — the Traveloop registration list. */
export const BOOKING_RELATIONSHIPS = EMERGENCY_RELATIONSHIPS;

export const MIN_AGE = 1;
export const MAX_AGE = 120;

/** One participant as the form holds it: every field a string, as typed. */
export type ParticipantDraft = {
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  nationality: string;
  /** Used only when `nationality` is "Other". */
  nationalityOther: string;
  sex: Sex | "";
  age: string;
  email: string;
  phone: string;
  /** The trip the pass's insurance covers; must include race day. */
  arrivalDate: string;
  departureDate: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  /** Used only when `emergencyContactRelationship` is "Other". */
  emergencyRelationshipOther: string;
};

export type BookingDraft = {
  date: string;
  time: string;
  teamName: string;
  participants: ParticipantDraft[];
  /** The Urban Sprint declaration, worded in the console. */
  termsAccepted: boolean;
  /** The Traveloop and insurance terms that come with each Platinum Pass. */
  passTermsAccepted: boolean;
};

export type Participant = {
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  nationality: string;
  sex: Sex;
  age: number;
  email: string;
  phone: string;
  arrivalDate: string;
  departureDate: string;
  address: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
};

export type ValidBooking = {
  date: string;
  time: SlotTime;
  teamName: string;
  participants: Participant[];
};

/**
 * Error messages keyed by field: "slot", "teamName", "terms", "passTerms", or
 * "p<index>.<field>" for a participant (e.g. "p2.email").
 */
export type BookingErrors = Record<string, string>;

export type BookingValidation =
  | { ok: true; value: ValidBooking }
  | { ok: false; errors: BookingErrors };

export function emptyParticipant(): ParticipantDraft {
  return {
    fullName: "",
    documentType: "mykad",
    documentNumber: "",
    nationality: "",
    nationalityOther: "",
    sex: "",
    age: "",
    email: "",
    phone: "",
    arrivalDate: "",
    departureDate: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    emergencyRelationshipOther: "",
  };
}

const MAX_NAME_LENGTH = 100;
const MAX_ADDRESS_LENGTH = 500;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TEAM_NAME_MIN = 2;
const TEAM_NAME_MAX = 40;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

/** "2026-10-03" -> "3 Oct 2026", for messages. */
function shortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-MY", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * A MyKad number is YYMMDD-PB-###G: twelve digits, the first six a birth date.
 * Checking the date part catches the commonest typo (a transposed digit) that
 * a bare length check would let through to the insurer.
 */
export function normaliseMyKad(value: string): string | null {
  const digits = value.replace(/[\s-]/g, "");
  if (!/^\d{12}$/.test(digits)) return null;

  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

export function normalisePassport(value: string): string | null {
  const cleaned = value.replace(/[\s-]/g, "").toUpperCase();
  return /^[A-Z0-9]{6,20}$/.test(cleaned) ? cleaned : null;
}

/** Keeps a leading + and the digits; 8–15 digits is every real mobile number, local or international. */
export function normalisePhone(value: string): string | null {
  const cleaned = value.replace(/[\s\-().]/g, "");
  return /^\+?\d{8,15}$/.test(cleaned) ? cleaned : null;
}

function validateParticipant(
  raw: Partial<ParticipantDraft> | null | undefined,
  index: number,
  errors: BookingErrors,
  /** The race date, when a real one was picked — the trip has to include it. */
  raceDate: string | null
): Participant | null {
  const key = (field: string) => `p${index}.${field}`;
  const before = Object.keys(errors).length;
  const input = raw ?? {};

  const fullName = text(input.fullName);
  if (!fullName) errors[key("fullName")] = "Enter their full name as it appears on the IC or passport.";
  else if (fullName.length > MAX_NAME_LENGTH) errors[key("fullName")] = "That name is too long.";

  const documentType: DocumentType | null =
    input.documentType === "mykad" || input.documentType === "passport" ? input.documentType : null;
  if (!documentType) errors[key("documentType")] = "Choose MyKad or passport.";

  let documentNumber = "";
  const rawDocument = text(input.documentNumber);
  if (!rawDocument) {
    errors[key("documentNumber")] =
      documentType === "passport" ? "Enter the passport number." : "Enter the IC number.";
  } else if (documentType === "mykad") {
    const normalised = normaliseMyKad(rawDocument);
    if (normalised) documentNumber = normalised;
    else errors[key("documentNumber")] = "A MyKad number is 12 digits, like 900101-14-5678.";
  } else if (documentType === "passport") {
    const normalised = normalisePassport(rawDocument);
    if (normalised) documentNumber = normalised;
    else errors[key("documentNumber")] = "A passport number is 6–20 letters and digits.";
  }

  // A MyKad holder is Malaysian by definition, so the form doesn't ask.
  let nationality = "Malaysian";
  if (documentType === "passport") {
    const chosen = text(input.nationality);
    nationality = chosen === "Other" ? text(input.nationalityOther) : chosen;
    if (!chosen) errors[key("nationality")] = "Choose their nationality.";
    else if (!nationality) errors[key("nationalityOther")] = "Enter their nationality.";
    else if (nationality.length > MAX_NAME_LENGTH) errors[key("nationalityOther")] = "That's too long.";
  }

  const sex = input.sex === "male" || input.sex === "female" ? input.sex : null;
  if (!sex) errors[key("sex")] = "Choose one.";

  const ageText = text(input.age);
  const age = /^\d{1,3}$/.test(ageText) ? Number(ageText) : NaN;
  if (!ageText) errors[key("age")] = "Enter their age.";
  else if (!(age >= MIN_AGE && age <= MAX_AGE)) errors[key("age")] = "Enter an age in whole years.";

  const email = text(input.email).toLowerCase();
  if (!email) errors[key("email")] = "Enter their email address.";
  else if (email.length > 254 || !EMAIL.test(email)) errors[key("email")] = "That email address doesn't look right.";

  const rawPhone = text(input.phone);
  const phone = rawPhone ? normalisePhone(rawPhone) : null;
  if (!rawPhone) errors[key("phone")] = "Enter their mobile number.";
  else if (!phone) errors[key("phone")] = "Enter a mobile number with its area code, e.g. 012-345 6789.";

  // The Platinum Pass's insurance covers the trip, so the trip has to cover
  // the race. A local racing for the day enters race day for both.
  const arrivalDate = text(input.arrivalDate);
  const departureDate = text(input.departureDate);
  if (!arrivalDate) errors[key("arrivalDate")] = "Enter the day they arrive in Penang.";
  else if (!isIsoDate(arrivalDate)) errors[key("arrivalDate")] = "That date doesn't look right.";
  if (!departureDate) errors[key("departureDate")] = "Enter the day they leave Penang.";
  else if (!isIsoDate(departureDate)) errors[key("departureDate")] = "That date doesn't look right.";

  if (isIsoDate(arrivalDate) && isIsoDate(departureDate)) {
    if (departureDate < arrivalDate) {
      errors[key("departureDate")] = "Departure can't be before arrival.";
    } else if (raceDate && (raceDate < arrivalDate || raceDate > departureDate)) {
      errors[key("arrivalDate")] = `Their trip has to include race day, ${shortDate(raceDate)}.`;
    }
  }

  const address = text(input.address);
  if (!address) errors[key("address")] = "Enter their home address.";
  else if (address.length > MAX_ADDRESS_LENGTH) errors[key("address")] = "That address is too long.";

  // Optional, as on the pass registration form, but kept tidy when given.
  const emergencyContactName = text(input.emergencyContactName);
  if (emergencyContactName.length > MAX_NAME_LENGTH) {
    errors[key("emergencyContactName")] = "That name is too long.";
  }

  const rawEmergencyPhone = text(input.emergencyContactPhone);
  const emergencyContactPhone = rawEmergencyPhone ? normalisePhone(rawEmergencyPhone) : null;
  if (rawEmergencyPhone && !emergencyContactPhone) {
    errors[key("emergencyContactPhone")] = "Enter a phone number with its area code.";
  }

  const chosenRelationship = text(input.emergencyContactRelationship);
  const emergencyContactRelationship =
    chosenRelationship === "Other" ? text(input.emergencyRelationshipOther) : chosenRelationship;
  if (emergencyContactRelationship.length > MAX_NAME_LENGTH) {
    errors[key("emergencyRelationshipOther")] = "That's too long.";
  }

  if (Object.keys(errors).length > before) return null;

  return {
    fullName,
    documentType: documentType!,
    documentNumber,
    nationality,
    sex: sex!,
    age,
    email,
    phone: phone!,
    arrivalDate,
    departureDate,
    address,
    emergencyContactName: emergencyContactName || null,
    emergencyContactPhone,
    emergencyContactRelationship: emergencyContactRelationship || null,
  };
}

/**
 * Checks a booking end to end. `now` decides which slots are still open — the
 * server passes the real time; the browser does too, and is simply overruled
 * if its clock is wrong.
 */
export function validateBooking(input: unknown, now: Date = new Date()): BookingValidation {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Partial<BookingDraft>;
  const errors: BookingErrors = {};

  const date = text(raw.date);
  const time = text(raw.time);
  if (!date || !time) {
    errors.slot = "Pick a date and a time slot.";
  } else if (!isSlotTime(time) || !isSlotBookable(date, time, now)) {
    errors.slot = "That slot is no longer open for booking. Pick another.";
  }
  // Only real dates are offered, so one that parses is race day even before a
  // time is picked — enough to check each racer's trip against.
  const raceDate = isIsoDate(date) ? date : null;

  const teamName = text(raw.teamName);
  if (teamName.length < TEAM_NAME_MIN) errors.teamName = "Give your team a name.";
  else if (teamName.length > TEAM_NAME_MAX) errors.teamName = `Keep it under ${TEAM_NAME_MAX} characters.`;

  const rawParticipants = Array.isArray(raw.participants) ? raw.participants : [];
  if (rawParticipants.length < TEAM_SIZE_MIN || rawParticipants.length > TEAM_SIZE_MAX) {
    errors.teamSize = `A team is ${TEAM_SIZE_MIN} to ${TEAM_SIZE_MAX} people.`;
  }

  const participants = rawParticipants
    .slice(0, TEAM_SIZE_MAX)
    .map((participant, index) => validateParticipant(participant, index, errors, raceDate));

  // One person can't be two members of a team. Flagged on the later entry,
  // which is the one most likely to have been copied by mistake.
  const seen = new Map<string, number>();
  participants.forEach((participant, index) => {
    if (!participant) return;
    const id = `${participant.documentType}:${participant.documentNumber}`;
    const first = seen.get(id);
    if (first === undefined) seen.set(id, index);
    else errors[`p${index}.documentNumber`] = `Same document as participant ${first + 1}.`;
  });

  if (raw.termsAccepted !== true) {
    errors.terms = "Tick the box to confirm you have read and understood the terms.";
  }
  if (raw.passTermsAccepted !== true) {
    errors.passTerms = "Tick the box to accept the Platinum Pass and insurance terms.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      date,
      time: time as SlotTime,
      teamName,
      participants: participants as Participant[],
    },
  };
}
