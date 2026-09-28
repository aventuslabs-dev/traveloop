"use client";

import type { CSSProperties, ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * A form's submit button that knows its form is in flight: disabled, so a
 * second tap on a slow connection can't send it twice, and marked busy.
 * With `pendingLabel` its text swaps for that while it waits; without one,
 * aria-busy lets the stylesheet swap part of it (.us-idle-label /
 * .us-busy-label).
 */
export default function SubmitButton({
  children,
  pendingLabel,
  className,
  style,
  confirm,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  style?: CSSProperties;
  /** Asks first, for an action that can't be undone. */
  confirm?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={className}
      style={style}
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={
        confirm
          ? (event) => {
              if (!window.confirm(confirm)) event.preventDefault();
            }
          : undefined
      }
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
