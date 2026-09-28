"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/app/components/Icons";
import ConsoleSwitch from "@/app/[lang]/admin/(dashboard)/ConsoleSwitch";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: string;
  count?: number;
  /** A count that means work is waiting, drawn in red rather than grey. */
  alert?: boolean;
};

export type AdminNavGroup = { label: string; items: AdminNavItem[] };

/**
 * The Urban Sprint console chrome. It is the Traveloop admin shell's markup
 * and classes (globals.css), so the two consoles look and behave as one
 * product: a fixed rail on desktop, a slide-over below 1000px. The nav is
 * grouped by job — running bookings, running the live game, setting up.
 */
export default function AdminShell({
  children,
  groups,
  operator,
  canSwitch,
  signOut,
}: {
  children: React.ReactNode;
  groups: AdminNavGroup[];
  operator: string;
  /** The Traveloop operator also holds the Traveloop console, and can switch to it. */
  canSwitch: boolean;
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
          <Link className="admin-rail-logo" href="/urban-sprint/admin" aria-label="Urban Sprint console home">
            <Image src="/traveloop-logo.webp" alt="Traveloop" width={1280} height={345} priority />
          </Link>
          {canSwitch ? (
            <ConsoleSwitch current="urban-sprint" />
          ) : (
            <span className="admin-rail-badge is-sprint">Urban Sprint</span>
          )}
        </div>

        <div className="usc-rail-scroll">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="admin-rail-section">{group.label}</p>
              <nav className="admin-rail-nav" aria-label={group.label}>
                {group.items.map((item) => {
                  // The overview is the section root, so it needs an exact
                  // match or it would light up on every child route.
                  const active =
                    item.href === "/urban-sprint/admin"
                      ? pathname === item.href
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`admin-rail-link${active ? " is-active" : ""}`}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setRailOpen(false)}
                    >
                      <Icon name={item.icon} />
                      {item.label}
                      {item.count !== undefined && item.count > 0 && (
                        <span className={`admin-rail-count${item.alert ? " is-alert" : ""}`}>
                          {item.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="admin-rail-foot">
          <Link className="usc-rail-public" href="/urban-sprint" target="_blank">
            <Icon name="external" />
            Open public site
          </Link>
          <div className="admin-rail-user">
            <span className="admin-rail-avatar" aria-hidden="true">
              {operator.slice(0, 2).toUpperCase()}
            </span>
            <span>
              <span className="admin-rail-user-name">{operator}</span>
              <span className="admin-rail-user-role">
                {canSwitch ? "Traveloop & Urban Sprint admin" : "Urban Sprint admin"}
              </span>
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
