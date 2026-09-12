"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/app/components/Icons";

type NavItem = { href: string; label: string; icon: string; count?: number };

export type AdminShellProps = {
  children: React.ReactNode;
  /** Rendered as a form so sign-out stays a POST, not a link. */
  signOut: React.ReactNode;
  adminEmail: string;
  counts: { orders: number; bookings: number; customers: number };
};

/**
 * The console chrome: a fixed rail on desktop, a slide-over on tablet and
 * phone. Counts live in the rail so the operator can see there's work waiting
 * without opening each section.
 */
export default function AdminShell({ children, signOut, adminEmail, counts }: AdminShellProps) {
  const pathname = usePathname();
  const [railOpen, setRailOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setRailOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const nav: NavItem[] = [
    { href: "/admin", label: "Orders", icon: "receipt", count: counts.orders },
    { href: "/admin/bookings", label: "Bookings", icon: "calendar", count: counts.bookings },
    { href: "/admin/users", label: "Customers", icon: "users", count: counts.customers },
  ];

  return (
    <div className={`admin-shell${railOpen ? " rail-open" : ""}`}>
      <button
        type="button"
        className="admin-rail-scrim"
        aria-label="Close navigation"
        tabIndex={railOpen ? 0 : -1}
        onClick={() => setRailOpen(false)}
      />

      <aside className="admin-rail">
        <div className="admin-rail-head">
          <Link className="admin-rail-logo" href="/admin" aria-label="Traveloop admin home">
            <Image src="/traveloop-logo.webp" alt="Traveloop" width={1280} height={345} priority />
          </Link>
          <span className="admin-rail-badge">Operations</span>
        </div>

        <p className="admin-rail-section">Manage</p>
        <nav className="admin-rail-nav" aria-label="Admin sections">
          {nav.map((item) => {
            // "/admin" is the orders index; a prefix match would light it up everywhere.
            const active =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-rail-link${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
                // Navigating is always a reason to dismiss the slide-over.
                onClick={() => setRailOpen(false)}
              >
                <Icon name={item.icon} />
                {item.label}
                {item.count !== undefined && item.count > 0 && (
                  <span className="admin-rail-count">{item.count}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="admin-rail-foot">
          <div className="admin-rail-user">
            <span className="admin-rail-avatar" aria-hidden="true">
              {adminEmail.slice(0, 2).toUpperCase()}
            </span>
            <span>
              <span className="admin-rail-user-name">{adminEmail}</span>
              <span className="admin-rail-user-role">Administrator</span>
            </span>
          </div>
          {signOut}
        </div>
      </aside>

      <main className="admin-content">
        <div className="admin-content-inner">
          <button
            type="button"
            className="admin-rail-toggle"
            aria-expanded={railOpen}
            onClick={() => setRailOpen(true)}
          >
            <Icon name="grid" />
            Menu
          </button>
          {children}
        </div>
      </main>
    </div>
  );
}
