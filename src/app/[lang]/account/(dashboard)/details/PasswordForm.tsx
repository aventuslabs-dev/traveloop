"use client";

import { useState } from "react";
import { Icon } from "@/app/components/Icons";
import { updatePassword } from "../../actions";

const MIN_LENGTH = 8;

/**
 * The two rules the server enforces are echoed live as the customer types, so
 * a mismatch is caught before the round-trip rather than as a redirect back
 * with an error banner.
 */
export default function PasswordForm() {
  const [reveal, setReveal] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const longEnough = password.length >= MIN_LENGTH;
  const matches = password.length > 0 && password === confirmPassword;

  return (
    <form className="account-password-form" action={updatePassword}>
      <label className="admin-field">
        <span>New password</span>
        <div className="account-input-wrap">
          <input
            name="password"
            type={reveal ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={MIN_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="account-input-toggle"
            onClick={() => setReveal((current) => !current)}
            aria-label={reveal ? "Hide password" : "Show password"}
          >
            <Icon name={reveal ? "eyeOff" : "eye"} />
          </button>
        </div>
      </label>

      <label className="admin-field">
        <span>Confirm new password</span>
        <div className="account-input-wrap">
          <input
            name="confirmPassword"
            type={reveal ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={MIN_LENGTH}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </label>

      <ul className="account-rules">
        <li className={longEnough ? "is-met" : ""}>
          <Icon name="check" />
          At least {MIN_LENGTH} characters
        </li>
        <li className={matches ? "is-met" : ""}>
          <Icon name="check" />
          Both entries match
        </li>
      </ul>

      <button className="button primary" type="submit">
        Update password
      </button>
    </form>
  );
}
