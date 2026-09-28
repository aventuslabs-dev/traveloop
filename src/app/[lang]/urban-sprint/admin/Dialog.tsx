"use client";

import { useRef } from "react";
import { Icon } from "@/app/components/Icons";

/**
 * A button that opens its forms in a modal.
 *
 * Replaces the console's old in-row popovers, which opened inside a table
 * cell and were cut off by the table's scroll box. A native <dialog> sits in
 * the top layer, so it is never clipped, traps focus, and closes on Escape.
 *
 * The forms inside are server-rendered server-action forms; this component
 * only opens and closes the box. It closes as a form submits — the action's
 * redirect brings the page back with its flash message.
 */
export default function Dialog({
  label,
  title,
  description,
  icon,
  variant = "default",
  wide = false,
  children,
}: {
  label: string;
  title: string;
  description?: string;
  icon?: string;
  variant?: "default" | "primary" | "small";
  wide?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  const buttonClass =
    variant === "primary" ? "ad-btn ad-btn-primary" : variant === "small" ? "ad-btn ad-btn-sm" : "ad-btn";

  return (
    <>
      <button type="button" className={buttonClass} onClick={() => ref.current?.showModal()}>
        {icon && <Icon name={icon} />}
        {label}
      </button>

      <dialog
        ref={ref}
        className={`usc-dialog${wide ? " is-wide" : ""}`}
        aria-label={title}
        // A click on the backdrop lands on the dialog element itself.
        onClick={(event) => {
          if (event.target === ref.current) ref.current.close();
        }}
        onSubmit={() => {
          // After the browser has taken the submission, so the action still runs.
          window.setTimeout(() => ref.current?.close(), 0);
        }}
      >
        <div className="usc-dialog-head">
          <div>
            <h2 className="ad-dialog-title">{title}</h2>
            {description && <p className="usc-dialog-sub">{description}</p>}
          </div>
          <button
            type="button"
            className="usc-dialog-close"
            aria-label="Close"
            onClick={() => ref.current?.close()}
          >
            <Icon name="x" />
          </button>
        </div>
        <div className="usc-dialog-body">{children}</div>
      </dialog>
    </>
  );
}
