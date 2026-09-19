"use client";

import { usePathname } from "next/navigation";
import Link from "@/i18n/Link";
import { splitLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Icon } from "@/app/components/Icons";

const LINKS = [
  { href: "/account", key: "overview", icon: "ticket" },
  { href: "/account/experiences", key: "experiences", icon: "compass" },
  { href: "/account/bookings", key: "bookings", icon: "clock" },
  { href: "/account/details", key: "details", icon: "user" },
] as const;

/**
 * Portal tabs. `/account` is matched exactly — every other route lives under
 * it, so a prefix match would keep the first tab permanently active.
 *
 * The locale prefix is stripped off the pathname before comparing: on /cn the
 * real path is /cn/account, which starts with neither "/account" nor any of
 * the hrefs below, and every tab would render inactive.
 */
export default function AccountNav({ t }: { t: Dictionary["account"]["nav"] }) {
  const pathname = usePathname();
  const { rest: path } = splitLocale(pathname);

  return (
    <nav className="account-nav" aria-label={t.aria}>
      {LINKS.map((link) => {
        const active =
          link.href === "/account" ? path === "/account" : path.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`account-nav-link${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={link.icon} />
            {t[link.key]}
          </Link>
        );
      })}
    </nav>
  );
}
