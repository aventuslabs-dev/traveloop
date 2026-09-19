import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/i18n/Link";
import { localePage, type LangParams } from "@/i18n/page";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Icon } from "@/app/components/Icons";
import { login } from "./actions";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  // No canonical or hreflang: the portal is noindex, so pointing crawlers at
  // its other locale would only invite them to a page they're told to skip.
  return {
    title: dict.account.login.title,
    robots: { index: false, follow: false },
  };
}

type LoginPageProps = LangParams & {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AccountLoginPage({ params, searchParams }: LoginPageProps) {
  const { dict } = await localePage(params);
  const t = dict.account.login;
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
        <h1>{t.title}</h1>
        <p className="account-login-sub">{t.sub}</p>

        {hasError && (
          <p className="account-flash is-error">
            <Icon name="alert" />
            {t.failed}
          </p>
        )}

        <label className="admin-field">
          <span>{t.email}</span>
          <input name="email" type="email" autoComplete="email" required autoFocus />
        </label>

        <label className="admin-field">
          <span>{t.password}</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>

        <button className="button primary" type="submit">
          {t.submit}
        </button>

        <p className="account-login-help">
          {t.helpBefore}
          <Link href="/contact">{t.helpLink}</Link>
          {t.helpAfter}
        </p>
      </form>

      <Link className="account-login-back" href="/">
        <Icon name="arrowRight" />
        {t.back}
      </Link>
    </main>
  );
}
