"use client";

/**
 * A submit button that asks first. For the console's irreversible actions —
 * deleting, voiding, releasing — so a mis-tap on a phone at the finish line
 * doesn't cost a record.
 */
export default function ConfirmButton({
  message,
  className = "ad-btn ad-btn-sm ad-btn-ghost-danger",
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
