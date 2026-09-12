import type { CustomerProfile } from "@/lib/customer-profile-db";

export type ProfileRow = {
  label: string;
  value: string | null;
  /** Free-text answers (address) get the full grid width instead of one column. */
  wide?: boolean;
};

/**
 * The registration fields the portal shows, in the order they're asked for at
 * checkout. Shared so the summary, the completeness meter and the dashboard
 * prompt can never disagree about what "complete" means.
 */
export function profileRows(profile: CustomerProfile | null): ProfileRow[] {
  return [
    { label: "Full name", value: profile?.fullName ?? null },
    { label: "Nationality", value: profile?.nationality ?? null },
    { label: "Travel document", value: profile?.travelDocumentType ?? null },
    { label: "Document number", value: profile?.travelDocumentNumber ?? null },
    { label: "Address", value: profile?.address ?? null, wide: true },
    { label: "Emergency contact", value: profile?.emergencyContactName ?? null },
    { label: "Emergency phone", value: profile?.emergencyContactPhone ?? null },
    { label: "Relationship", value: profile?.emergencyContactRelationship ?? null },
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

export function profileCompleteness(profile: CustomerProfile | null): ProfileCompleteness {
  const rows = profileRows(profile);
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
