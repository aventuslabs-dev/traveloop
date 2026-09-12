import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { localePage, type LangParams } from "@/i18n/page";
import { pageMetadata } from "@/i18n/metadata";
import { fill } from "@/i18n/interpolate";
import type { LegalBlock } from "@/i18n/legal";

export async function generateMetadata({ params }: LangParams) {
  return pageMetadata(params, "/terms", (dict) => dict.terms.meta);
}

/**
 * The date the English terms were last revised. Kept out of the dictionaries
 * on purpose: it describes the document, not the translation, so it must not
 * be able to differ between locales.
 */
const LAST_UPDATED = "16 August 2026";

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case "p":
      return <p>{block.text}</p>;
    case "h3":
      return <h3>{block.text}</h3>;
    case "ul":
      return (
        <ul className="legal-list">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="legal-list numbered">
          {block.items.map((item, i) => (
            <li key={i}>
              <strong>{item.lead}</strong> {item.text}
            </li>
          ))}
        </ol>
      );
    case "dl":
      return (
        <dl className="legal-details">
          {block.items.map((item, i) => (
            <div key={i}>
              <dt>{item.term}</dt>
              <dd>{item.href ? <a href={item.href}>{item.text}</a> : item.text}</dd>
            </div>
          ))}
        </dl>
      );
  }
}

export default async function TermsPage({ params }: LangParams) {
  const { dict } = await localePage(params);
  const t = dict.terms;

  return (
    <>
      <Navbar dict={dict.common.nav} language={dict.common.language} forceScrolled />
      <main id="main">
        <section className="arrival section-light page-hero">
          <div className="section-heading centered">
            <p className="eyebrow">{t.hero.eyebrow}</p>
            <h2>
              {t.hero.headingLead}
              <br />
              <em>{t.hero.headingEm}</em>
            </h2>
            <p>{t.hero.body}</p>
            <p className="legal-updated">
              {fill(t.hero.lastUpdated, { date: LAST_UPDATED })}
            </p>
            <p className="legal-prevailing">{t.hero.prevailing}</p>
          </div>
        </section>

        <section className="section-light legal-section">
          <div className="legal-layout">
            <aside className="legal-toc" aria-label={t.tocLabel}>
              <p className="legal-toc-title">{t.tocTitle}</p>
              <ol>
                {t.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`}>{s.label}</a>
                  </li>
                ))}
              </ol>
            </aside>

            <div className="legal-body">
              {t.sections.map((section) => (
                <section key={section.id} id={section.id} className="legal-block">
                  <h2>{section.heading}</h2>
                  {section.blocks.map((block, i) => (
                    <Block key={i} block={block} />
                  ))}
                </section>
              ))}

              <div className="legal-contact">
                <h3>{t.contact.heading}</h3>
                <p>
                  {t.contact.bodyBefore}
                  <a href="mailto:traveloop@3d-group.com.my">
                    traveloop@3d-group.com.my
                  </a>
                  {t.contact.bodyMiddle}
                  <a href="tel:+601139492888">+6011-3949-2888</a>
                  {t.contact.bodyAfter}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer dict={dict.common.footer} />
    </>
  );
}
