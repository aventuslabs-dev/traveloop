import type { CustomerProfile } from "@/lib/customer-profile-db";
import type { Dictionary } from "@/i18n/dictionaries";

/** The label set these rows are built from — `account.profile.rows` in either locale. */
export type ProfileRowLabels = Dictionary["account"]["profile"]["rows"];

export type ProfileRow = {
  /**
   * Which field this is, independent of language. The summary needs it to
   * decide whether a stored value is one of the translated dropdown answers,
   * which it cannot tell from a label that changes per locale.
   */
  key: keyof ProfileRowLabels;
  label: string;
  value: string | null;
  /** Free-text answers (address) get the full grid width instead of one column. */
  wide?: boolean;
};

/**
 * The registration fields the portal shows, in the order they're asked for at
 * checkout. Shared so the summary, the completeness meter and the dashboard
 * prompt can never disagree about what "complete" means.
 *
 * Labels are passed in rather than written here: the completeness count is the
 * same in both languages, but the names of the missing fields are not, and
 * this list is what "Still missing: …" is built from.
 */
export function profileRows(
  profile: CustomerProfile | null,
  labels: ProfileRowLabels
): ProfileRow[] {
  return [
    { key: "fullName", label: labels.fullName, value: profile?.fullName ?? null },
    { key: "nationality", label: labels.nationality, value: profile?.nationality ?? null },
    {
      key: "travelDocument",
      label: labels.travelDocument,
      value: profile?.travelDocumentType ?? null,
    },
    {
      key: "documentNumber",
      label: labels.documentNumber,
      value: profile?.travelDocumentNumber ?? null,
    },
    { key: "address", label: labels.address, value: profile?.address ?? null, wide: true },
    {
      key: "emergencyContact",
      label: labels.emergencyContact,
      value: profile?.emergencyContactName ?? null,
    },
    {
      key: "emergencyPhone",
      label: labels.emergencyPhone,
      value: profile?.emergencyContactPhone ?? null,
    },
    {
      key: "relationship",
      label: labels.relationship,
      value: profile?.emergencyContactRelationship ?? null,
    },
  ];
}

export type ProfileCompleteness = {
  filled: number;
  total: number;
  percent: number;
  /** Labels of the still-blank fields, for a "what's missing" prompt. */
  missing: string[];
  isEmpty: boolean;
  isComplete: boolean;
};

export function profileCompleteness(
  profile: CustomerProfile | null,
  labels: ProfileRowLabels
): ProfileCompleteness {
  const rows = profileRows(profile, labels);
  const missing = rows.filter((row) => !row.value).map((row) => row.label);
  const filled = rows.length - missing.length;

  return {
    filled,
    total: rows.length,
    percent: Math.round((filled / rows.length) * 100),
    missing,
    isEmpty: filled === 0,
    isComplete: missing.length === 0,
  };
}
