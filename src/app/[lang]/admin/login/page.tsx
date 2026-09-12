import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/app/components/Icons";
import { login } from "./actions";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const hasError = (await searchParams).error === "1";

  return (
    <main className="admin-auth">
      {/* The left panel states what this system is, so an operator landing here
          from a bookmark knows immediately which console they're signing in to. */}
      <section className="admin-auth-brand">
        <Link className="admin-auth-logo" href="/" aria-label="Traveloop home">
          <Image src="/traveloop-logo.webp" alt="Traveloop" width={1280} height={345} priority />
        </Link>

        <div className="admin-auth-headline">
          <h2>Operations console</h2>
          <p>
            Orders, traveller registrations, cultural-experience bookings and customer accounts —
            in one place.
          </p>
        </div>

        <div className="admin-auth-meta">
          <span>Traveloop Malaysia</span>
          <span>Authorised access only</span>
        </div>
      </section>

      <section className="admin-auth-panel">
        <form className="admin-auth-card" action={login}>
          <p className="admin-auth-eyebrow">Traveloop Admin</p>
          <h1>Sign in</h1>
          <p className="admin-auth-sub">Enter your operator credentials to continue.</p>

          {hasError && (
            <p className="ad-flash ad-flash-err" role="alert">
              <Icon name="alert" />
              Incorrect ID or password.
            </p>
          )}

          <label className="admin-field">
            <span>Operator ID</span>
            <input name="id" type="text" autoComplete="username" required autoFocus />
          </label>

          <label className="admin-field">
            <span>Password</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>

          <button className="ad-btn ad-btn-primary ad-btn-block" type="submit">
            Sign in
          </button>

          <p className="admin-auth-foot">
            This area is restricted to Traveloop staff. Customers should use the{" "}
            <Link href="/account/login">customer portal</Link>.
          </p>
        </form>
      </section>
    </main>
  );
}
