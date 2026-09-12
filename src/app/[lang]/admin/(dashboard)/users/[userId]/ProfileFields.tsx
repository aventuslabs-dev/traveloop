"use client";

import { useState } from "react";
import {
  NATIONALITIES,
  DOCUMENT_TYPES,
  EMERGENCY_RELATIONSHIPS,
} from "@/lib/registration";
import type { CustomerProfile } from "@/lib/customer-profile-db";

/**
 * A stored value outside the preset list came from an "Other" free-text answer,
 * so the dropdown reopens on "Other" with the text beside it — same convention
 * as the customer's own profile form in the portal.
 */
function splitOther(value: string | null, options: readonly string[]) {
  if (!value) return { choice: "", other: "" };
  return options.includes(value) ? { choice: value, other: "" } : { choice: "Other", other: value };
}

export default function ProfileFields({
  email,
  profile,
}: {
  email: string;
  profile: CustomerProfile | null;
}) {
  const initialNationality = splitOther(profile?.nationality ?? null, NATIONALITIES);
  const initialRelationship = splitOther(
    profile?.emergencyContactRelationship ?? null,
    EMERGENCY_RELATIONSHIPS
  );

  const [nationality, setNationality] = useState(initialNationality.choice);
  const [relationship, setRelationship] = useState(initialRelationship.choice);

  return (
    <>
      <div className="ad-field-grid">
      <label className="admin-field">
        <span>Sign-in email</span>
        <input name="email" type="email" defaultValue={email} required maxLength={200} />
      </label>

      <label className="admin-field">
        <span>Full name</span>
        <input
          name="fullName"
          type="text"
          defaultValue={profile?.fullName ?? ""}
          maxLength={120}
        />
      </label>

      <label className="admin-field">
        <span>Nationality</span>
        <select
          name="nationality"
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
        >
          <option value="">Not set</option>
          {NATIONALITIES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      </div>

      {nationality === "Other" && (
        <label className="admin-field">
          <span>Specify nationality</span>
          <input name="nationalityOther" type="text" defaultValue={initialNationality.other} />
        </label>
      )}

      <div className="ad-field-grid">
        <label className="admin-field">
          <span>Travel document</span>
          <select name="travelDocumentType" defaultValue={profile?.travelDocumentType ?? ""}>
            <option value="">Not set</option>
            {DOCUMENT_TYPES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>Document number</span>
          <input
            name="travelDocumentNumber"
            type="text"
            defaultValue={profile?.travelDocumentNumber ?? ""}
          />
        </label>
      </div>

      <label className="admin-field">
        <span>Address</span>
        <textarea name="address" rows={3} defaultValue={profile?.address ?? ""} />
      </label>

      <div className="ad-field-grid">
        <label className="admin-field">
          <span>Emergency contact</span>
          <input
            name="emergencyContactName"
            type="text"
            defaultValue={profile?.emergencyContactName ?? ""}
          />
        </label>
        <label className="admin-field">
          <span>Emergency phone</span>
          <input
            name="emergencyContactPhone"
            type="tel"
            defaultValue={profile?.emergencyContactPhone ?? ""}
          />
        </label>
        <label className="admin-field">
          <span>Relationship</span>
          <select
            name="emergencyContactRelationship"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
          >
            <option value="">Not set</option>
            {EMERGENCY_RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      {relationship === "Other" && (
        <label className="admin-field">
          <span>Specify relationship</span>
          <input
            name="emergencyContactRelationshipOther"
            type="text"
            defaultValue={initialRelationship.other}
          />
        </label>
      )}
    </>
  );
}
