"use client";

import { useState } from "react";
import { Icon } from "@/app/components/Icons";
import type { Dictionary } from "@/i18n/dictionaries";
import { fill } from "@/i18n/interpolate";
import { MIN_PASSWORD_LENGTH } from "@/app/[lang]/account/password-rules";
import { updatePassword } from "../../actions";

/**
 * The two rules the server enforces are echoed live as the customer types, so
 * a mismatch is caught before the round-trip rather than as a redirect back
 * with an error banner.
 */
export default function PasswordForm({ t }: { t: Dictionary["account"]["password"] }) {
  const [reveal, setReveal] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const longEnough = password.length >= MIN_PASSWORD_LENGTH;
  const matches = password.length > 0 && password === confirmPassword;

  return (
    <form className="account-password-form" action={updatePassword}>
      <label className="admin-field">
        <span>{t.newPassword}</span>
        <div className="account-input-wrap">
          <input
            name="password"
            type={reveal ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="account-input-toggle"
            onClick={() => setReveal((current) => !current)}
            aria-label={reveal ? t.hide : t.show}
          >
            <Icon name={reveal ? "eyeOff" : "eye"} />
          </button>
        </div>
      </label>

      <label className="admin-field">
        <span>{t.confirmPassword}</span>
        <div className="account-input-wrap">
          <input
            name="confirmPassword"
            type={reveal ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </label>

      <ul className="account-rules">
        <li className={longEnough ? "is-met" : ""}>
          <Icon name="check" />
          {fill(t.ruleLength, { n: MIN_PASSWORD_LENGTH })}
        </li>
        <li className={matches ? "is-met" : ""}>
          <Icon name="check" />
          {t.ruleMatch}
        </li>
      </ul>

      <button className="button primary" type="submit">
        {t.submit}
      </button>
    </form>
  );
}
