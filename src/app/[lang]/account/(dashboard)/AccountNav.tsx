"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/app/components/Icons";

const LINKS = [
  { href: "/account", label: "Overview", icon: "ticket" },
  { href: "/account/experiences", label: "Experiences", icon: "compass" },
  { href: "/account/bookings", label: "My bookings", icon: "clock" },
  { href: "/account/details", label: "My details", icon: "user" },
];

/**
 * Portal tabs. `/account` is matched exactly — every other route lives under
 * it, so a prefix match would keep the first tab permanently active.
 */
export default function AccountNav() {
  const pathname = usePathname();

  return (
    <nav className="account-nav" aria-label="Account sections">
      {LINKS.map((link) => {
        const active =
          link.href === "/account" ? pathname === "/account" : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`account-nav-link${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={link.icon} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
