import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCustomerProfile } from "@/lib/customer-profile-db";
import { logout } from "../actions";
import AccountNav from "./AccountNav";

/** First letter of the customer's name, falling back to their email, for the avatar chip. */
function initialFor(name: string | null | undefined, email: string | null | undefined): string {
  return (name?.trim()?.[0] ?? email?.[0] ?? "?").toUpperCase();
}

export default async function AccountDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getCustomerProfile(user.id) : null;

  return (
    <div className="account-shell">
      <header className="account-header">
        <Link className="account-header-brand" href="/">
          <Image src="/traveloop-logo.webp" alt="Traveloop" width={1280} height={345} />
        </Link>

        <div className="account-header-right">
          <Link className="account-header-user" href="/account/details">
            <span className="account-avatar" aria-hidden="true">
              {initialFor(profile?.fullName, user?.email)}
            </span>
            <span className="account-header-meta">
              {profile?.fullName && (
                <span className="account-header-name">{profile.fullName}</span>
              )}
              {user?.email && <span className="account-header-email">{user.email}</span>}
            </span>
          </Link>
          <form action={logout}>
            <button className="button ghost dark admin-logout" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <AccountNav />

      <main className="account-main">{children}</main>
    </div>
  );
}
