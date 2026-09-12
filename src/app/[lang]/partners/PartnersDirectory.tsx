"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "@/i18n/Link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icon } from "@/app/components/Icons";
import { partnerCategories, type LocalizedPartner } from "@/app/data/partners";
import type enCommon from "@/i18n/dictionaries/en/common";
import type enPartners from "@/i18n/dictionaries/en/partners";

const ALL = "All" as const;

export default function PartnersDirectory({
  partners,
  dict,
  nav,
  language,
  footer,
}: {
  partners: LocalizedPartner[];
  dict: typeof enPartners;
  nav: typeof enCommon.nav;
  language: typeof enCommon.language;
  footer: typeof enCommon.footer;
}) {
  // Filtering stays keyed on the English category, which is the stable id;
  // only the label shown on the button is translated.
  const [activeFilter, setActiveFilter] = useState<
    typeof ALL | (typeof partnerCategories)[number]
  >(ALL);

  const filters = [ALL, ...partnerCategories];

  const filteredPartners = useMemo(
    () =>
      activeFilter === ALL
        ? partners
        : partners.filter((p) => p.category === activeFilter),
    [activeFilter, partners]
  );

  const labelFor = (filter: (typeof filters)[number]) =>
    filter === ALL
      ? dict.filters.all
      : partners.find((p) => p.category === filter)?.categoryLabel ?? filter;

  return (
    <>
      <Navbar dict={nav} language={language} forceScrolled />
      <main id="main">
        <section className="arrival section-light page-hero">
          <div className="section-heading centered">
            <h2>{dict.hero.heading}</h2>
            <p>{dict.hero.body}</p>
          </div>
        </section>

        <section className="section-light" style={{ paddingBottom: "clamp(90px,10vw,150px)" }}>
          <div className="pill-filter">
            {filters.map((f) => (
              <button
                type="button"
                key={f}
                className={`pill-filter-btn${activeFilter === f ? " active" : ""}`}
                onClick={() => setActiveFilter(f)}
              >
                {labelFor(f)}
              </button>
            ))}
          </div>

          <div className="partner-directory-grid">
            {filteredPartners.length === 0 ? (
              <p className="partner-directory-empty">{dict.empty}</p>
            ) : (
              filteredPartners.map((p) => (
                <article className="partner-directory-card" key={p.name}>
                  <div className="partner-directory-top">
                    <span className="partner-directory-logo">
                      <Image
                        src={p.logo}
                        alt={p.name}
                        width={140}
                        height={96}
                        sizes="140px"
                      />
                    </span>
                    <span className="partner-directory-category">{p.categoryLabel}</span>
                  </div>
                  <strong className="partner-directory-name">{p.name}</strong>
                  {p.location && (
                    <span className="partner-directory-location">
                      <Icon name="pin" />
                      {p.location}
                    </span>
                  )}
                  <span className="partner-directory-deal">{p.deal}</span>
                  {p.terms && (
                    <span className="partner-directory-terms">{p.terms}</span>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="closing section-dark closing-red">
          <div className="closing-pattern" />
          <div className="closing-content">
            <h2>{dict.closing.heading}</h2>
            <p className="closing-copy">{dict.closing.body}</p>
            <Link className="button white" href="/contact">
              {dict.closing.cta}
            </Link>
          </div>
        </section>
      </main>
      <Footer dict={footer} />
    </>
  );
}
