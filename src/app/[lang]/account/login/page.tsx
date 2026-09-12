import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/app/components/Icons";
import { login } from "./actions";

export const metadata: Metadata = {
  title: "Sign in to your account",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AccountLoginPage({ searchParams }: LoginPageProps) {
  const hasError = (await searchParams).error === "1";

  return (
    <main className="account-login">
      <form className="account-login-card" action={login}>
        <Image
          className="account-login-logo"
          src="/traveloop-logo.webp"
          alt="Traveloop"
          width={1280}
          height={345}
          priority
        />
        <h1>Sign in to your account</h1>
        <p className="account-login-sub">
          Use the email and password we sent you after your purchase.
        </p>

        {hasError && (
          <p className="account-flash is-error">
            <Icon name="alert" />
            Incorrect email or password.
          </p>
        )}

        <label className="admin-field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required autoFocus />
        </label>

        <label className="admin-field">
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>

        <button className="button primary" type="submit">
          Sign in
        </button>

        <p className="account-login-help">
          Can&apos;t get in? <Link href="/contact">Contact our team</Link> and we&apos;ll sort it
          out.
        </p>
      </form>

      <Link className="account-login-back" href="/">
        <Icon name="arrowRight" />
        Back to traveloop.my
      </Link>
    </main>
  );
}
