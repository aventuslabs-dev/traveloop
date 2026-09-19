import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCustomerProfile } from "@/lib/customer-profile-db";
import { profileCompleteness } from "@/app/[lang]/account/profile-summary";
import { MIN_PASSWORD_LENGTH } from "@/app/[lang]/account/password-rules";
import { Icon } from "@/app/components/Icons";
import { localePage, type LangParams } from "@/i18n/page";
import { getDictionary } from "@/i18n/dictionaries";
import { htmlLang, isLocale, type Locale } from "@/i18n/config";
import { fill } from "@/i18n/interpolate";
import { phrases } from "@/app/data/phrases";
import ProfileSection from "./ProfileSection";
import PasswordForm from "./PasswordForm";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return {
    title: dict.account.details.title,
    robots: { index: false, follow: false },
  };
}

type DetailsPageProps = LangParams & {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function formatDate(value: string, lang: Locale): string {
  return new Date(value).toLocaleDateString(lang === "en" ? "en-MY" : htmlLang[lang], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function AccountDetailsPage({ params, searchParams }: DetailsPageProps) {
  const { lang, dict } = await localePage(params);
  const t = dict.account.details;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${lang}/account/login`);
  }

  const query = await searchParams;
  const profileUpdated = query.profileUpdated === "1";
  const profileError = query.profileError === "1";
  const passwordUpdated = query.passwordUpdated === "1";
  const passwordError = typeof query.passwordError === "string" ? query.passwordError : null;

  const profile = await getCustomerProfile(user.id);
  const completeness = profileCompleteness(profile, dict.account.profile.rows);

  return (
    <>
      <header className="account-greeting">
        <p className="account-eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p>{t.lede}</p>
      </header>

      {profileUpdated && (
        <p className="account-flash is-success">
          <Icon name="check" />
          {t.savedFlash}
        </p>
      )}
      {profileError && (
        <p className="account-flash is-error">
          <Icon name="alert" />
          {t.saveFailedFlash}
        </p>
      )}

      <section className="account-section">
        <div className="account-section-head">
          <h2>{t.registrationHeading}</h2>
          <span className="account-count">
            {fill(t.filledCount, { filled: completeness.filled, total: completeness.total })}
          </span>
        </div>
        <p className="account-section-lede">{t.registrationLede}</p>

        <div className="account-card">
          {!completeness.isEmpty && (
            <div className={`account-meter${completeness.isComplete ? " is-complete" : ""}`}>
              <div
                className="account-meter-track"
                role="progressbar"
                aria-valuenow={completeness.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t.meterAria}
              >
                <span style={{ width: `${completeness.percent}%` }} />
              </div>
              <p>
                {completeness.isComplete ? (
                  <>
                    <Icon name="check" />
                    {t.complete}
                  </>
                ) : (
                  <>
                    <Icon name="alert" />
                    {fill(t.stillMissing, {
                      fields: phrases(lang).joinList(completeness.missing),
                    })}
                  </>
                )}
              </p>
            </div>
          )}

          <ProfileSection profile={profile} t={dict.account.profile} lang={lang} />
        </div>

        {profile?.termsAcceptedAt && (
          <p className="account-footnote">
            {fill(t.termsAccepted, { date: formatDate(profile.termsAcceptedAt, lang) })}
          </p>
        )}
      </section>

      <section className="account-section">
        <div className="account-section-head">
          <h2>{t.securityHeading}</h2>
        </div>
        <p className="account-section-lede">{t.securityLede}</p>

        {passwordUpdated && (
          <p className="account-flash is-success">
            <Icon name="check" />
            {t.passwordUpdatedFlash}
          </p>
        )}
        {passwordError === "short" && (
          <p className="account-flash is-error">
            <Icon name="alert" />
            {fill(t.passwordTooShortFlash, { n: MIN_PASSWORD_LENGTH })}
          </p>
        )}
        {passwordError === "mismatch" && (
          <p className="account-flash is-error">
            <Icon name="alert" />
            {t.passwordMismatchFlash}
          </p>
        )}
        {passwordError === "1" && (
          <p className="account-flash is-error">
            <Icon name="alert" />
            {t.passwordFailedFlash}
          </p>
        )}

        <div className="account-card">
          <div className="account-security-row">
            <span className="account-security-icon" aria-hidden="true">
              <Icon name="mail" />
            </span>
            <div className="account-security-main">
              <p className="account-security-label">{t.emailLabel}</p>
              <p className="account-security-value">{user.email}</p>
            </div>
          </div>

          <p className="account-form-label with-rule">{t.changePassword}</p>
          <PasswordForm t={dict.account.password} />
        </div>
      </section>
    </>
  );
}
