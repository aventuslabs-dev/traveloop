import Link from "next/link";

export type Console = "traveloop" | "urban-sprint";

/**
 * Moves the operator between their two consoles. Shown only to the operator:
 * one login holds both (lib/admin-auth.ts), while an Urban Sprint admin can't
 * open the Traveloop console, so the Urban Sprint rail offers it to nobody else.
 */
export default function ConsoleSwitch({ current }: { current: Console }) {
  return (
    <nav className="admin-switch" aria-label="Switch console">
      <Link
        href="/admin"
        className={current === "traveloop" ? "is-active" : undefined}
        aria-current={current === "traveloop" ? "page" : undefined}
      >
        Traveloop
      </Link>
      <Link
        href="/urban-sprint/admin"
        className={current === "urban-sprint" ? "is-active is-sprint" : undefined}
        aria-current={current === "urban-sprint" ? "page" : undefined}
      >
        Urban Sprint
      </Link>
    </nav>
  );
}
