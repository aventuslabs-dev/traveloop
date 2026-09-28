import type { Tab } from "./TabBar";

/**
 * The bottom-navigation sets, defined once.
 *
 * Every href here stays inside its own role's shell. That matters more than it
 * looks: a tab pointing at the public leaderboard would navigate out of the
 * layout that renders the bar, and the bar would vanish under the user's
 * thumb. The public board is reachable from these screens, but as a link out —
 * never as a tab.
 */

export function gamemasterTabs(stationsRemaining?: number): Tab[] {
  return [
    { href: "/urban-sprint/gamemaster", label: "Team", icon: "shield", exact: true },
    {
      href: "/urban-sprint/gamemaster/stations",
      label: "Stations",
      icon: "pin",
      badge: stationsRemaining,
    },
    { href: "/urban-sprint/gamemaster/leaderboard", label: "Board", icon: "table" },
  ];
}

/**
 * A team's link page. Every href carries the team's token, so the bar never
 * leads out of the team's own pages.
 *
 * "Shops" rather than "Stations": racers are being sent to real businesses,
 * and that is the word that makes sense on the street. Organisers and
 * gamemasters keep saying "stations", which is the game's own term. It sits
 * in the middle and raised, because deciding where to walk next is the thing
 * a racer opens their phone to do.
 */
export function teamLinkTabs(base: string): Tab[] {
  return [
    { href: base, label: "My team", icon: "shield", exact: true },
    { href: `${base}/shops`, label: "Shops", icon: "store", prominent: true },
    { href: `${base}/leaderboard`, label: "Board", icon: "table" },
  ];
}
