"use client";

import { useState } from "react";
import {
  NATIONALITIES,
  DOCUMENT_TYPES,
  EMERGENCY_RELATIONSHIPS,
} from "@/lib/registration";
import type { CustomerProfile } from "@/lib/customer-profile-db";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import {
  documentTypeLabelsCn,
  nationalityLabelsCn,
  optionLabel,
  relationshipLabelsCn,
} from "@/app/data/cn/registration";
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
  t: Dictionary["account"]["profile"]["form"];
  lang: Locale;
  /** Returns to the read-only summary without saving. */
  onCancel?: () => void;
};

/**
 * Every `<option>` below submits the English value from `lib/registration.ts`
 * and only *displays* the translation: the server validates against that
 * allow-list, and the insurer's records must not depend on which language the
 * customer happened to be reading.
 */
export default function ProfileForm({ profile, t, lang, onCancel }: ProfileFormProps) {
  const initialNationality = splitOther(profile?.nationality ?? null, NATIONALITIES);
  const initialRelationship = splitOther(
    profile?.emergencyContactRelationship ?? null,
    EMERGENCY_RELATIONSHIPS
  );

  const [nationality, setNationality] = useState(initialNationality.choice);
  const [relationship, setRelationship] = useState(initialRelationship.choice);

  return (
    <form className="account-profile-form" action={updateProfile}>
      <p className="account-form-label">{t.aboutYou}</p>

      <label className="admin-field">
        <span>{t.fullName}</span>
        <input
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder={t.fullNamePlaceholder}
          defaultValue={profile?.fullName ?? ""}
        />
      </label>

      <div className="register-row">
        <label className="admin-field">
          <span>{t.nationality}</span>
          <select
            name="nationality"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
          >
            <option value="">{t.notSet}</option>
            {NATIONALITIES.map((n) => (
              <option key={n} value={n}>
                {optionLabel(n, nationalityLabelsCn, lang)}
              </option>
            ))}
          </select>
        </label>

        {nationality === "Other" ? (
          <label className="admin-field">
            <span>{t.otherNationality}</span>
            <input name="otherNationality" type="text" defaultValue={initialNationality.other} />
          </label>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>

      <div className="register-row">
        <label className="admin-field">
          <span>{t.documentType}</span>
          <select name="travelDocumentType" defaultValue={profile?.travelDocumentType ?? ""}>
            <option value="">{t.notSet}</option>
            {DOCUMENT_TYPES.map((d) => (
              <option key={d} value={d}>
                {optionLabel(d, documentTypeLabelsCn, lang)}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-field">
          <span>{t.documentNumber}</span>
          <input
            name="travelDocumentNumber"
            type="text"
            autoComplete="off"
            defaultValue={profile?.travelDocumentNumber ?? ""}
          />
        </label>
      </div>

      <label className="admin-field">
        <span>{t.address}</span>
        <textarea
          name="address"
          rows={3}
          placeholder={t.addressPlaceholder}
          defaultValue={profile?.address ?? ""}
        />
      </label>

      <p className="account-form-label">{t.emergencyHeading}</p>
      <p className="account-form-hint">{t.emergencyHint}</p>

      <div className="register-row">
        <label className="admin-field">
          <span>{t.contactName}</span>
          <input
            name="emergencyContactName"
            type="text"
            defaultValue={profile?.emergencyContactName ?? ""}
          />
        </label>

        <label className="admin-field">
          <span>{t.contactPhone}</span>
          <input
            name="emergencyContactPhone"
            type="tel"
            placeholder={t.contactPhonePlaceholder}
            defaultValue={profile?.emergencyContactPhone ?? ""}
          />
        </label>
      </div>

      <div className="register-row">
        <label className="admin-field">
          <span>{t.relationship}</span>
          <select
            name="emergencyContactRelationship"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
          >
            <option value="">{t.notSet}</option>
            {EMERGENCY_RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {optionLabel(r, relationshipLabelsCn, lang)}
              </option>
            ))}
          </select>
        </label>

        {relationship === "Other" ? (
          <label className="admin-field">
            <span>{t.otherRelationship}</span>
            <input name="otherRelationship" type="text" defaultValue={initialRelationship.other} />
          </label>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>

      <div className="account-form-actions">
        {onCancel && (
          <button type="button" className="button ghost dark" onClick={onCancel}>
            {t.cancel}
          </button>
        )}
        <button className="button primary" type="submit">
          {t.save}
        </button>
      </div>
    </form>
  );
}
