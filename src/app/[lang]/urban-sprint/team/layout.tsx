import type { Metadata } from "next";
import { requireRole } from "@/lib/urban-sprint/auth";

export const metadata: Metadata = {
  title: "My team",
  robots: { index: false, follow: false },
};

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  await requireRole("participant");
  return <div className="us-app">{children}</div>;
}
