"use client";

import { useState } from "react";
import {
  NATIONALITIES,
  DOCUMENT_TYPES,
  EMERGENCY_RELATIONSHIPS,
} from "@/lib/registration";
import type { CustomerProfile } from "@/lib/customer-profile-db";
import { updateProfile } from "../../actions";

/**
 * A stored value that isn't one of the preset options came from an "Other"
 * free-text answer, so the dropdown reopens on "Other" with the text alongside.
 */
function splitOther(value: string | null, options: readonly string[]) {
  if (!value) return { choice: "", other: "" };
  return options.includes(value) ? { choice: value, other: "" } : { choice: "Other", other: value };
}

type ProfileFormProps = {
  profile: CustomerProfile | null;
  /** Returns to the read-only summary without saving. */
  onCancel?: () => void;
};

export default function ProfileForm({ profile, onCancel }: ProfileFormProps) {
  const initialNationality = splitOther(profile?.nationality ?? null, NATIONALITIES);
  const initialRelationship = splitOther(
    profile?.emergencyContactRelationship ?? null,
    EMERGENCY_RELATIONSHIPS
  );

  const [nationality, setNationality] = useState(initialNationality.choice);
  const [relationship, setRelationship] = useState(initialRelationship.choice);

  return (
    <form className="account-profile-form" action={updateProfile}>
      <p className="account-form-label">About you</p>

      <label className="admin-field">
        <span>Full name</span>
        <input
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="As printed on your travel document"
          defaultValue={profile?.fullName ?? ""}
        />
      </label>

      <div className="register-row">
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

        {nationality === "Other" ? (
          <label className="admin-field">
            <span>Please specify your nationality</span>
            <input name="otherNationality" type="text" defaultValue={initialNationality.other} />
          </label>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>

      <div className="register-row">
        <label className="admin-field">
          <span>Type of travel document</span>
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
            autoComplete="off"
            defaultValue={profile?.travelDocumentNumber ?? ""}
          />
        </label>
      </div>

      <label className="admin-field">
        <span>Home address</span>
        <textarea
          name="address"
          rows={3}
          placeholder="Street, city, postcode, country"
          defaultValue={profile?.address ?? ""}
        />
      </label>

      <p className="account-form-label">Emergency contact</p>
      <p className="account-form-hint">
        Who we&apos;d call on your behalf if something happened during your trip.
      </p>

      <div className="register-row">
        <label className="admin-field">
          <span>Contact name</span>
          <input
            name="emergencyContactName"
            type="text"
            defaultValue={profile?.emergencyContactName ?? ""}
          />
        </label>

        <label className="admin-field">
          <span>Contact phone number</span>
          <input
            name="emergencyContactPhone"
            type="tel"
            placeholder="Include the country code"
            defaultValue={profile?.emergencyContactPhone ?? ""}
          />
        </label>
      </div>

      <div className="register-row">
        <label className="admin-field">
          <span>Relationship to you</span>
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

        {relationship === "Other" ? (
          <label className="admin-field">
            <span>Please specify the relationship</span>
            <input name="otherRelationship" type="text" defaultValue={initialRelationship.other} />
          </label>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>

      <div className="account-form-actions">
        {onCancel && (
          <button type="button" className="button ghost dark" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="button primary" type="submit">
          Save details
        </button>
      </div>
    </form>
  );
}
