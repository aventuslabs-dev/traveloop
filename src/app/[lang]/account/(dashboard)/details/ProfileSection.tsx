"use client";

import { useState } from "react";
import type { CustomerProfile } from "@/lib/customer-profile-db";
import { profileRows, type ProfileRow } from "@/app/[lang]/account/profile-summary";
import { Icon } from "@/app/components/Icons";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import {
  documentTypeLabelsCn,
  nationalityLabelsCn,
  optionLabel,
  relationshipLabelsCn,
} from "@/app/data/cn/registration";
import ProfileForm from "./ProfileForm";

type ProfileCopy = Dictionary["account"]["profile"];

/**
 * Nationality, document type and relationship are stored as the English
 * strings the insurer's records use, so the saved value is translated for
 * display only — exactly as the checkout form does when offering them.
 */
const DROPDOWN_LABELS: Partial<Record<ProfileRow["key"], Record<string, string>>> = {
  nationality: nationalityLabelsCn,
  travelDocument: documentTypeLabelsCn,
  relationship: relationshipLabelsCn,
};

function displayValue(row: ProfileRow, t: ProfileCopy, lang: Locale): string {
  if (!row.value) return t.notProvided;

  const labels = DROPDOWN_LABELS[row.key];
  return labels ? optionLabel(row.value, labels, lang) : row.value;
}

/**
 * Shows the saved registration details as a plain summary and only swaps in
 * the form when the customer asks to edit — a page of always-editable inputs
 * reads as an unfinished form rather than as their information.
 */
export default function ProfileSection({
  profile,
  t,
  lang,
}: {
  profile: CustomerProfile | null;
  t: ProfileCopy;
  lang: Locale;
}) {
  const [editing, setEditing] = useState(false);

  const rows = profileRows(profile, t.rows);
  const isEmpty = rows.every((row) => !row.value);

  if (editing) {
    return (
      <ProfileForm
        profile={profile}
        t={t.form}
        lang={lang}
        onCancel={() => setEditing(false)}
      />
    );
  }

  if (isEmpty) {
    return (
      <div className="account-inline-empty">
        <span className="account-inline-empty-icon" aria-hidden="true">
          <Icon name="user" />
        </span>
        <p>{t.emptyBody}</p>
        <button type="button" className="button primary" onClick={() => setEditing(true)}>
          {t.addDetails}
        </button>
      </div>
    );
  }

  return (
    <>
      <dl className="account-detail-grid">
        {rows.map((row) => (
          <div key={row.key} className={`account-detail-row${row.wide ? " is-wide" : ""}`}>
            <dt>{row.label}</dt>
            <dd className={row.value ? "" : "account-detail-missing"}>
              {displayValue(row, t, lang)}
            </dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        className="button ghost dark account-edit-button"
        onClick={() => setEditing(true)}
      >
        <Icon name="pencil" />
        {t.edit}
      </button>
    </>
  );
}
