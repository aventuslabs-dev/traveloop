import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCustomerProfile } from "@/lib/customer-profile-db";
import { profileCompleteness } from "@/app/[lang]/account/profile-summary";
import { Icon } from "@/app/components/Icons";
import ProfileSection from "./ProfileSection";
import PasswordForm from "./PasswordForm";

export const metadata: Metadata = {
  title: "My details",
  robots: { index: false, follow: false },
};

type DetailsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function AccountDetailsPage({ searchParams }: DetailsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login");
  }

  const params = await searchParams;
  const profileUpdated = params.profileUpdated === "1";
  const profileError = params.profileError === "1";
  const passwordUpdated = params.passwordUpdated === "1";
  const passwordError = typeof params.passwordError === "string" ? params.passwordError : null;

  const profile = await getCustomerProfile(user.id);
  const completeness = profileCompleteness(profile);

  return (
    <>
      <header className="account-greeting">
        <p className="account-eyebrow">Your account</p>
        <h1>My details</h1>
        <p>
          The information we hold for you, and the password you use to sign in to this portal.
        </p>
      </header>

      {profileUpdated && (
        <p className="account-flash is-success">
          <Icon name="check" />
          Your details were saved.
        </p>
      )}
      {profileError && (
        <p className="account-flash is-error">
          <Icon name="alert" />
          We couldn&apos;t save your details. Please try again.
        </p>
      )}

      <section className="account-section">
        <div className="account-section-head">
          <h2>Registration details</h2>
          <span className="account-count">
            {completeness.filled} of {completeness.total} filled in
          </span>
        </div>
        <p className="account-section-lede">
          Collected when you bought your pass. Keep them accurate — your pass and travel insurance
          cover rely on them.
        </p>

        <div className="account-card">
          {!completeness.isEmpty && (
            <div className={`account-meter${completeness.isComplete ? " is-complete" : ""}`}>
              <div
                className="account-meter-track"
                role="progressbar"
                aria-valuenow={completeness.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Registration details completeness"
              >
                <span style={{ width: `${completeness.percent}%` }} />
              </div>
              <p>
                {completeness.isComplete ? (
                  <>
                    <Icon name="check" />
                    Everything we need is on file.
                  </>
                ) : (
                  <>
                    <Icon name="alert" />
                    Still missing: {completeness.missing.join(", ")}.
                  </>
                )}
              </p>
            </div>
          )}

          <ProfileSection profile={profile} />
        </div>

        {profile?.termsAcceptedAt && (
          <p className="account-footnote">
            You accepted the Traveloop terms and insurance conditions on{" "}
            {formatDate(profile.termsAcceptedAt)}.
          </p>
        )}
      </section>

      <section className="account-section">
        <div className="account-section-head">
          <h2>Sign-in &amp; security</h2>
        </div>
        <p className="account-section-lede">
          Your email is the username for this portal. Get in touch if you need it changed.
        </p>

        {passwordUpdated && (
          <p className="account-flash is-success">
            <Icon name="check" />
            Your password was updated.
          </p>
        )}
        {passwordError === "short" && (
          <p className="account-flash is-error">
            <Icon name="alert" />
            Password must be at least 8 characters.
          </p>
        )}
        {passwordError === "mismatch" && (
          <p className="account-flash is-error">
            <Icon name="alert" />
            Those passwords don&apos;t match.
          </p>
        )}
        {passwordError === "1" && (
          <p className="account-flash is-error">
            <Icon name="alert" />
            We couldn&apos;t update your password. Please try again.
          </p>
        )}

        <div className="account-card">
          <div className="account-security-row">
            <span className="account-security-icon" aria-hidden="true">
              <Icon name="mail" />
            </span>
            <div className="account-security-main">
              <p className="account-security-label">Email address</p>
              <p className="account-security-value">{user.email}</p>
            </div>
          </div>

          <p className="account-form-label with-rule">Change password</p>
          <PasswordForm />
        </div>
      </section>
    </>
  );
}
