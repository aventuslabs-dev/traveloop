import type { Metadata } from "next";
import { requireRole } from "@/lib/urban-sprint/auth";

export const metadata: Metadata = {
  title: "Gamemaster",
  robots: { index: false, follow: false },
};

/**
 * The role gate for the gamemaster area. Every page and action beneath it
 * re-checks too — this is the cheap first pass, not the only one.
 */
export default async function GamemasterLayout({ children }: { children: React.ReactNode }) {
  await requireRole("gamemaster");
  return <div className="us-app">{children}</div>;
}
