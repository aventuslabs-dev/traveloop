"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { resetCustomerPassword, type PasswordFormState } from "@/app/[lang]/admin/user-actions";
import { Icon } from "@/app/components/Icons";
import { Panel } from "../../ui";

const INITIAL: PasswordFormState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="ad-btn" type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Setting…" : "Set new password"}
    </button>
  );
}

/**
 * There is no self-service password reset in the customer portal yet, so this
 * is how a locked-out customer gets back in. The new password is displayed once
 * and never persisted in readable form.
 */
export default function PasswordReset({ userId }: { userId: string }) {
  const [state, formAction] = useActionState(resetCustomerPassword, INITIAL);
  const [copied, setCopied] = useState(false);

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <Panel title="Password" icon="lock" footer={<SubmitButton />}>
        <p className="ad-panel-note">
          Sets a new sign-in password immediately. The customer is not emailed — pass it on
          yourself. There is no self-service reset in the portal yet, so this is how a locked-out
          customer gets back in.
        </p>

        {state.status === "reset" && state.password && (
          <div className="ad-secret">
            <code>{state.password}</code>
            <button
              type="button"
              className="ad-btn"
              onClick={() => {
                navigator.clipboard?.writeText(state.password!);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}

        <label className="admin-field" style={{ maxWidth: "340px", marginBottom: 0 }}>
          <span>New password (optional)</span>
          <input
            name="password"
            type="text"
            autoComplete="off"
            minLength={8}
            placeholder="Leave blank to generate"
          />
        </label>

        {state.status === "error" && (
          <p className="ad-flash ad-flash-err" role="alert" style={{ marginTop: "15px", marginBottom: 0 }}>
            <Icon name="alert" />
            {state.error}
          </p>
        )}
      </Panel>
    </form>
  );
}
