"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/app/components/Icons";

export type Tab = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  /**
   * Raises the tab out of the bar as a filled circle. For the one screen a
   * role is most likely to want — reserve it for a single tab, or it stops
   * meaning anything.
   */
  prominent?: boolean;
  /** A section's home tab: lit only on its own page, not on every page beneath it. */
  exact?: boolean;
};

/**
 * Bottom navigation for the gamemaster's views and a team's link page.
 *
 * Bottom rather than top because these are one-handed, on-the-move screens —
 * the thumb reaches the bottom of a phone, not the top. It sits above the safe
 * area on notched devices (see .us-tabbar in urban-sprint.css) and is hidden
 * on desktop, where the same routes get a wider layout.
 */
export default function TabBar({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();

  return (
    <nav className="us-tabbar" aria-label="Sections">
      {tabs.map((tab) => {
        // Exact match for a section's home; prefix for everything beneath it,
        // so /gamemaster/stations doesn't also light up the dashboard tab.
        const active = pathname === tab.href || (!tab.exact && pathname.startsWith(`${tab.href}/`));

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`us-tab${active ? " is-active" : ""}${tab.prominent ? " is-prominent" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="us-tab-icon">
              <Icon name={tab.icon} />
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="us-tab-badge">{tab.badge}</span>
              )}
            </span>
            <span className="us-tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
