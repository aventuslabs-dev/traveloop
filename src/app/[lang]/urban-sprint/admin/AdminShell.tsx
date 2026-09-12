"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/app/components/Icons";

export type AdminNavItem = { href: string; label: string; icon: string; count?: number };

/**
 * The Urban Sprint console chrome: a fixed rail on desktop, a slide-over on
 * phones. It follows the shape of the Traveloop admin shell so an operator who
 * knows one knows the other, but it is a separate component in the Urban
 * Sprint tree — the two consoles are different products and shouldn't be
 * coupled through shared chrome.
 */
export default function AdminShell({
  children,
  nav,
  operator,
  signOut,
}: {
  children: React.ReactNode;
  nav: AdminNavItem[];
  operator: string;
  /** A form, so signing out stays a POST rather than a link. */
  signOut: React.ReactNode;
}) {
  const pathname = usePathname();
  const [railOpen, setRailOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setRailOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`us-admin${railOpen ? " rail-open" : ""}`}>
      <button
        type="button"
        className="us-admin-scrim"
        aria-label="Close navigation"
        tabIndex={railOpen ? 0 : -1}
        onClick={() => setRailOpen(false)}
      />

      <aside className="us-admin-rail">
        <div className="us-admin-railhead">
          <Link className="us-wordmark" href="/urban-sprint/admin" aria-label="Urban Sprint admin">
            <span className="us-wordmark-mark" aria-hidden>
              US
            </span>
            <span className="us-wordmark-text">
              <b>Urban</b>
              <i>Sprint</i>
            </span>
          </Link>
          <span className="us-admin-badge">Control</span>
        </div>

        <nav className="us-admin-nav" aria-label="Console sections">
          {nav.map((item) => {
            // The overview lives at the section root, so it needs an exact
            // match or it would light up on every child route.
            const active =
              item.href === "/urban-sprint/admin"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`us-admin-link${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => setRailOpen(false)}
              >
                <Icon name={item.icon} />
                {item.label}
                {item.count !== undefined && item.count > 0 && (
                  <span className="us-admin-count">{item.count}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="us-admin-railfoot">
          <Link className="us-admin-public" href="/urban-sprint" target="_blank">
            <Icon name="eye" />
            Public page
          </Link>
          <p className="us-admin-operator">{operator}</p>
          {signOut}
        </div>
      </aside>

      <div className="us-admin-main">
        <div className="us-admin-topbar">
          <button
            type="button"
            className="us-admin-burger"
            aria-label="Open navigation"
            aria-expanded={railOpen}
            onClick={() => setRailOpen(true)}
          >
            <span aria-hidden />
            <span aria-hidden />
            <span aria-hidden />
          </button>
          <span className="us-admin-topname">Urban Sprint control</span>
        </div>

        <main className="us-admin-content">{children}</main>
      </div>
    </div>
  );
}
