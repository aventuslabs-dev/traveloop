"use client";

import { useState } from "react";
import type { CustomerProfile } from "@/lib/customer-profile-db";
import { profileRows } from "@/app/[lang]/account/profile-summary";
import { Icon } from "@/app/components/Icons";
import ProfileForm from "./ProfileForm";

/**
 * Shows the saved registration details as a plain summary and only swaps in
 * the form when the customer asks to edit — a page of always-editable inputs
 * reads as an unfinished form rather than as their information.
 */
export default function ProfileSection({ profile }: { profile: CustomerProfile | null }) {
  const [editing, setEditing] = useState(false);

  const rows = profileRows(profile);
  const isEmpty = rows.every((row) => !row.value);

  if (editing) {
    return <ProfileForm profile={profile} onCancel={() => setEditing(false)} />;
  }

  if (isEmpty) {
    return (
      <div className="account-inline-empty">
        <span className="account-inline-empty-icon" aria-hidden="true">
          <Icon name="user" />
        </span>
        <p>
          We don&apos;t have your registration details yet. It takes about a minute, and your pass
          and insurance cover need them.
        </p>
        <button type="button" className="button primary" onClick={() => setEditing(true)}>
          Add your details
        </button>
      </div>
    );
  }

  return (
    <>
      <dl className="account-detail-grid">
        {rows.map((row) => (
          <div key={row.label} className={`account-detail-row${row.wide ? " is-wide" : ""}`}>
            <dt>{row.label}</dt>
            <dd className={row.value ? "" : "account-detail-missing"}>
              {row.value ?? "Not provided"}
            </dd>
          </div>
        ))}
      </dl>
      <button type="button" className="button ghost dark account-edit-button" onClick={() => setEditing(true)}>
        <Icon name="pencil" />
        Edit details
      </button>
    </>
  );
}
