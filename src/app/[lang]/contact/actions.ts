"use server";

import { sendContactEnquiryEmail } from "@/lib/email";
import { actionLocale } from "@/i18n/server";
import { getDictionary } from "@/i18n/dictionaries";
import enContact from "@/i18n/dictionaries/en/contact";

export type ContactFormState = {
  status: "idle" | "sent" | "error";
  error?: string;
};

export type SubjectKey = keyof typeof enContact.subjects;

/**
 * The subject arrives as a stable key rather than a label.
 *
 * The enquiry lands in an English-speaking inbox and the team filters on these
 * four values, so the *transport* stays English no matter which language the
 * visitor filled the form in — only the option they read is translated.
 */
const SUBJECT_KEYS = Object.keys(enContact.subjects) as SubjectKey[];

const MAX = { name: 120, email: 200, message: 4000 };

/** Deliberately loose — this only rejects obvious nonsense, the real check is the reply bouncing. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Handles a submission from the contact form. Server-side validation is the
 * real gate — the `required` attributes in the markup are only a convenience,
 * since a form can be POSTed directly.
 */
export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  // Honeypot: a hidden field no human ever fills in, but most bots do.
  if (typeof formData.get("company") === "string" && formData.get("company") !== "") {
    // Report success so the bot doesn't retry with a different shape.
    return { status: "sent" };
  }

  // Errors are read by the person who just typed the form, so they follow the
  // page they submitted from rather than the site default.
  const { contact: t } = await getDictionary(await actionLocale());

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subjectRaw = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !message) {
    return { status: "error", error: t.errors.missing };
  }
  if (!EMAIL_RE.test(email)) {
    return { status: "error", error: t.errors.email };
  }
  if (name.length > MAX.name || email.length > MAX.email || message.length > MAX.message) {
    return { status: "error", error: t.errors.tooLong };
  }

  // Anything not in the list is a tampered POST; fall back rather than trusting it.
  const key: SubjectKey = SUBJECT_KEYS.includes(subjectRaw as SubjectKey)
    ? (subjectRaw as SubjectKey)
    : SUBJECT_KEYS[0];

  const delivered = await sendContactEnquiryEmail({
    name,
    email,
    subject: enContact.subjects[key],
    message,
  });

  if (!delivered) {
    return { status: "error", error: t.errors.sendFailed };
  }

  return { status: "sent" };
}
