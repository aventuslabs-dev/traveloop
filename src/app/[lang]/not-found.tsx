import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

/**
 * A not-found boundary cannot read `params`, so it has no locale to work from.
 * The proxy only ever routes a request here after prefixing it, which means
 * the page around it is already in the right language — but this file renders
 * in English regardless. That is the honest trade: a 404 in English on a
 * Chinese URL is better than a crash, and the nav and footer still carry the
 * visitor back into their own locale via the switcher.
 */
export default async function NotFound() {
  const { common } = await getDictionary(defaultLocale);

  return (
    <>
      <Navbar dict={common.nav} language={common.language} forceScrolled />
      <main id="main">
        <section className="arrival section-light page-hero">
          <div className="section-heading centered">
            <p className="eyebrow">404</p>
            <h1>{common.notFound.heading}</h1>
            <p>{common.notFound.body}</p>
          </div>
          <div className="notfound-actions">
            <Link className="button primary" href={`/${defaultLocale}/passes`}>
              {common.nav.purchasePass}
            </Link>
            <Link className="button ghost dark" href={`/${defaultLocale}`}>
              {common.notFound.cta}
            </Link>
            <Link className="button ghost dark" href={`/${defaultLocale}/contact`}>
              {common.nav.contact}
            </Link>
          </div>
        </section>
      </main>
      <Footer dict={common.footer} />
    </>
  );
}
