import type { Metadata } from "next";
import Link from "@/i18n/Link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { getPassTier, getPassTiers } from "@/app/data/passes";
import { localePage, type LangParams } from "@/i18n/page";
import { pageMetadata } from "@/i18n/metadata";
import RegistrationForm from "./RegistrationForm";

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  return {
    ...(await pageMetadata(params, "/passes/register", (d) => d.checkout.register.meta)),
    robots: { index: false, follow: false },
  };
}

type RegisterPageProps = LangParams & {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function RegisterPage({ params, searchParams }: RegisterPageProps) {
  const { lang, dict } = await localePage(params);
  const pass = (await searchParams).pass;
  // An unrecognised or missing ?pass just means an empty cart to start from —
  // the cart step itself lets the buyer add any tier, one or many.
  const seedTier = getPassTier(typeof pass === "string" ? pass : undefined);
  const t = dict.checkout.register;

  return (
    <>
      <Navbar dict={dict.common.nav} language={dict.common.language} forceScrolled />
      <main className="register-page">
        <div className="register-layout">
          <aside className="register-summary">
            <p className="eyebrow">{t.eyebrow}</p>
            <h1>{t.heading}</h1>
            <p className="register-summary-lede">{t.lede}</p>
            <Link className="register-summary-back" href="/passes">
              {t.back}
            </Link>
          </aside>

          <RegistrationForm
            passTiers={getPassTiers(lang)}
            seedPassKey={seedTier?.key}
            dict={dict.registration}
            insurance={dict.insurance}
          />
        </div>
      </main>
      <Footer dict={dict.common.footer} />
    </>
  );
}
