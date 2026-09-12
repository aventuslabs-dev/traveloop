"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { createCustomer, type CustomerFormState } from "@/app/[lang]/admin/user-actions";
import { Icon } from "@/app/components/Icons";

const INITIAL: CustomerFormState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="ad-btn ad-btn-primary" type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Creating…" : "Create account"}
    </button>
  );
}

/**
 * Manual account creation for customers who bought offline.
 *
 * A dialog rather than an inline panel so the trigger can live in the page
 * header without the expanded form fighting the header's layout. The generated
 * password is shown exactly once — it is never stored in readable form, so
 * closing the dialog means it can only be replaced, not recovered.
 */
export default function NewCustomerForm() {
  const [state, formAction] = useActionState(createCustomer, INITIAL);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  // Keep the backdrop click and Escape key closing the dialog cleanly.
  useEffect(() => {
    const dialog = dialogRef.current;
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) dialog?.close();
    };
    dialog?.addEventListener("click", onClick);
    return () => dialog?.removeEventListener("click", onClick);
  }, []);

  function close() {
    dialogRef.current?.close();
    setCopied(false);
    // The new row only exists on the server until the list is refetched.
    router.refresh();
  }

  const created = state.status === "created" ? state.created : undefined;

  return (
    <>
      <button
        type="button"
        className="ad-btn ad-btn-primary"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Icon name="user" />
        New customer
      </button>

      <dialog className="ad-dialog" ref={dialogRef} aria-label="New customer account">
        {created ? (
          <div className="ad-dialog-body">
            <h2 className="ad-dialog-title">
              <Icon name="check" /> Account created
            </h2>
            <p className="ad-panel-note">
              <strong>{created.email}</strong> can sign in now. Give them this password — it
              can&apos;t be shown again. Any orders already paid under this email have been linked
              to the account.
            </p>
            <div className="ad-secret">
              <code>{created.password}</code>
              <button
                type="button"
                className="ad-btn"
                onClick={() => {
                  navigator.clipboard?.writeText(created.password);
                  setCopied(true);
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="ad-dialog-foot">
              <button type="button" className="ad-btn ad-btn-primary" onClick={close}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form className="ad-dialog-body" action={formAction}>
            <h2 className="ad-dialog-title">New customer account</h2>
            <p className="ad-panel-note">
              For a walk-in or phone sale that never went through checkout.
            </p>

            <label className="admin-field">
              <span>Email</span>
              <input name="email" type="email" autoComplete="off" required maxLength={200} autoFocus />
            </label>

            <div className="ad-field-grid">
              <label className="admin-field">
                <span>Full name (optional)</span>
                <input name="fullName" type="text" autoComplete="off" maxLength={120} />
              </label>
              <label className="admin-field">
                <span>Password (optional)</span>
                <input
                  name="password"
                  type="text"
                  autoComplete="off"
                  minLength={8}
                  placeholder="Leave blank to generate"
                />
              </label>
            </div>

            {state.status === "error" && (
              <p className="ad-flash ad-flash-err" role="alert">
                <Icon name="alert" />
                {state.error}
              </p>
            )}

            <div className="ad-dialog-foot">
              <button type="button" className="ad-btn" onClick={() => dialogRef.current?.close()}>
                Cancel
              </button>
              <SubmitButton />
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
