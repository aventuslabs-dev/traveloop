"use client";

import { Suspense, useState } from "react";
import Link from "@/i18n/Link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icon } from "@/app/components/Icons";
import PassCard, { PassStack } from "@/app/components/PassCard";
import CheckoutCancelledNotice from "@/app/components/CheckoutCancelledNotice";
import {
  isComparisonPrice,
  tierKeys,
  type PassComparisonRow,
  type PassTier,
} from "@/app/data/passes";
import { fill } from "@/i18n/interpolate";
import type enCommon from "@/i18n/dictionaries/en/common";
import type enPasses from "@/i18n/dictionaries/en/passes";

export default function PassesPageClient({
  tiers,
  launchBadge,
  comparison,
  dict,
  nav,
  language,
  footer,
}: {
  tiers: PassTier[];
  /** Null when no automatic discount is running — the cards then show list prices only. */
  launchBadge: string | null;
  comparison: PassComparisonRow[];
  dict: typeof enPasses;
  nav: typeof enCommon.nav;
  language: typeof enCommon.language;
  footer: typeof enCommon.footer;
}) {
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [view, setView] = useState<"cards" | "table">("cards");

  const safetyFeatures = [
    { icon: "headset", ...dict.safety.features.helpline },
    { icon: "shield", ...dict.safety.features.embassy },
    { icon: "handshake", ...dict.safety.features.coordination },
  ];

  const passFaqs = Object.entries(dict.faq.items).map(([key, item]) => ({ key, ...item }));

  return (
    <>
      <Navbar dict={nav} language={language} forceScrolled />
      <main id="main">
        <section className="passes-hero">
          <div className="passes-hero-glow" aria-hidden="true" />
          <div className="passes-hero-inner">
            <div className="passes-hero-copy">
              <p className="eyebrow light">{dict.hero.eyebrow}</p>
              <h1>
                {dict.hero.headingLead}
                <br />
                <em>{dict.hero.headingEm}</em>
              </h1>
              <p className="passes-hero-lede">{dict.hero.lede}</p>
              <a className="button primary passes-hero-cta" href="#pricing">
                {dict.hero.cta}
              </a>
            </div>

            <PassStack />
          </div>
        </section>

        <section className="passes-section section-light" id="pricing">
          <div className="section-heading centered">
            <p className="eyebrow">{dict.pricing.eyebrow}</p>
            <h2>
              {dict.pricing.headingLead}
              <br />
              <em>{dict.pricing.headingEm}</em>
            </h2>
          </div>

          <Suspense fallback={null}>
            <CheckoutCancelledNotice />
          </Suspense>

          <div className="view-toggle" role="group" aria-label={dict.pricing.viewLabel}>
            <button
              type="button"
              className={`view-toggle-btn${view === "cards" ? " active" : ""}`}
              aria-pressed={view === "cards"}
              onClick={() => setView("cards")}
            >
              <Icon name="grid" />
              {dict.pricing.cardView}
            </button>
            <button
              type="button"
              className={`view-toggle-btn${view === "table" ? " active" : ""}`}
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
            >
              <Icon name="table" />
              {dict.pricing.tableView}
            </button>
          </div>

          {view === "cards" ? (
          <div className="pricing-grid">
            {tiers.map((tier) => (
              <div
                className={`pricing-card accent-${tier.key}${tier.badge ? " popular" : ""}`}
                key={tier.key}
              >
                {tier.badge && <span className="pricing-badge">{tier.badge}</span>}
                <div className="pricing-visual">
                  <PassCard tierKey={tier.key} name={tier.name} />
                </div>
                <h3 className="pricing-name">
                  {fill(dict.pricing.passName, { tier: tier.name })}
                </h3>
                <p className="pricing-tagline">
                  {tier.tagline} {tier.sub}
                </p>
                <div className="tier-price">
                  {tier.discounted && (
                    <s className="tier-price-original">
                      <small>MYR</small>
                      {tier.originalPrice}
                    </s>
                  )}
                  <strong className="tier-price-current">
                    <small>MYR</small>
                    {tier.price}
                  </strong>
                </div>
                {launchBadge && <span className="tier-discount-badge">{launchBadge}</span>}
                <ul className="tier-perks-list">
                  {tier.highlights.map((h) => (
                    <li key={h}>
                      <span className="tier-perk-icon">✓</span>
                      {h}
                    </li>
                  ))}
                </ul>
                <Link className="button primary" href={`/passes/register?pass=${tier.key}`}>
                  {fill(dict.pricing.choose, { tier: tier.name })}
                </Link>
              </div>
            ))}
          </div>
          ) : (
          <div className="compare-wrap">
            <div className="compare-scroll">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>{dict.pricing.perkColumn}</th>
                    {tiers.map((t) => (
                      <th key={t.key}>
                        <span className={`compare-swatch swatch-${t.key}`} aria-hidden="true" />
                        {t.name}
                        {t.badge && <span className="compare-badge">{t.badge}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      {tierKeys.map((key) => {
                        const value = row.values[key];

                        if (isComparisonPrice(value)) {
                          return (
                            <td key={key} className="compare-cell-yes">
                              <s className="compare-price-original">{value.regular}</s>
                              <strong className="compare-price-current">{value.price}</strong>
                              <span className="compare-price-discount">{value.discount}</span>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={key}
                            className={value ? "compare-cell-yes" : "compare-cell-no"}
                          >
                            {typeof value === "string"
                              ? value
                              : value
                                ? "✓"
                                : dict.pricing.notIncluded}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="compare-cta-row">
                    <td />
                    {tiers.map((t) => (
                      <td key={t.key}>
                        <Link className="compare-cta" href={`/passes/register?pass=${t.key}`}>
                          {fill(dict.pricing.choose, { tier: t.name })}
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          )}
        </section>

        <section className="passes-section safety-section">
          <div className="safety-inner">
            <div className="safety-copy">
              <h2>
                {dict.safety.headingLead}
                <br />
                <em>{dict.safety.headingEm}</em>
              </h2>
              <p>{dict.safety.body}</p>
            </div>

            <div className="safety-cards">
              {safetyFeatures.map((s) => (
                <div className="safety-card" key={s.title}>
                  <span className="safety-card-icon">
                    <Icon name={s.icon} />
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="passes-section section-cream passes-faq">
          <div className="section-heading centered">
            <p className="eyebrow">{dict.faq.eyebrow}</p>
            <h2>
              {dict.faq.headingLead}
              <br />
              <em>{dict.faq.headingEm}</em>
            </h2>
          </div>
          <div className="accordion passes-faq-accordion">
            {passFaqs.map((item) => {
              const isOpen = openFaq === item.key;
              return (
                <div className={`accordion-row${isOpen ? " open" : ""}`} key={item.key}>
                  <button
                    type="button"
                    className="accordion-head"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : item.key)}
                  >
                    <span className="accordion-title">{item.question}</span>
                    <span className="accordion-chevron" aria-hidden="true">
                      <svg viewBox="0 0 16 16" width="14" height="14">
                        <path
                          d="M3.5 6l4.5 4.5L12.5 6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                  {isOpen && <p className="accordion-body">{item.answer}</p>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="passes-closing">
          <div className="passes-closing-card">
            <p className="eyebrow light">{dict.closing.eyebrow}</p>
            <h3>{dict.closing.heading}</h3>
            <p>{dict.closing.body}</p>
            <div className="passes-closing-actions">
              <Link className="button primary" href="/contact">
                {dict.closing.talkToUs}
              </Link>
              <a
                className="button ghost"
                href="https://wa.me/601139492888"
                target="_blank"
                rel="noopener noreferrer"
              >
                {dict.closing.whatsapp}
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer dict={footer} />
    </>
  );
}
