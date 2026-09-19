import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { fill } from "@/i18n/interpolate";
import type { LegalBlock, LegalSection } from "@/i18n/legal";
import type enCommon from "@/i18n/dictionaries/en/common";

/**
 * The shape both /terms and /privacy are written in.
 *
 * The two documents differ only in their words: same hero, same sticky table
 * of contents, same block vocabulary, same contact footer. Keeping one
 * renderer means a fix to the anchor behaviour or the heading levels lands on
 * both, which matters for pages a regulator may read side by side.
 */
export type LegalDoc = {
  hero: {
    eyebrow: string;
    /** Rendered above `headingEm`, which carries the emphasis. */
    headingLead: string;
    headingEm: string;
    body: string;
    /** Contains `{date}`, filled from the `lastUpdated` prop. */
    lastUpdated: string;
    /**
     * Which language version governs. Shown on both locales: a translated
     * legal text without this line makes the two versions equally binding,
     * and every difference between them an argument.
     */
    prevailing: string;
  };
  tocTitle: string;
  tocLabel: string;
  /**
   * The "questions about this?" card under the last section.
   *
   * Optional: /privacy already names the same address twice in its own body —
   * once as the data-enquiries contact and again in the rights section, where
   * it belongs beside the instructions for making a request — so the card
   * only repeated it a third time.
   */
  contact?: {
    heading: string;
    bodyBefore: string;
    bodyMiddle: string;
    bodyAfter: string;
  };
  sections: LegalSection[];
};

/**
 * The registered business's contact details, not a translated string — an
 * address someone writes to about their personal data has to be identical in
 * both languages or the two pages name two different recipients.
 */
const CONTACT_EMAIL = "traveloop@3d-group.com.my";
const CONTACT_PHONE = "+6011-3949-2888";
const CONTACT_PHONE_HREF = "+601139492888";

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

export default function LegalDocument({
  doc,
  lastUpdated,
  common,
}: {
  doc: LegalDoc;
  /** Already-formatted date, e.g. "16 August 2026". Describes the document, so it never varies by locale. */
  lastUpdated: string;
  common: typeof enCommon;
}) {
  return (
    <>
      <Navbar dict={common.nav} language={common.language} forceScrolled />
      <main id="main">
        <section className="arrival section-light page-hero">
          <div className="section-heading centered">
            <p className="eyebrow">{doc.hero.eyebrow}</p>
            <h2>
              {doc.hero.headingLead}
              <br />
              <em>{doc.hero.headingEm}</em>
            </h2>
            <p>{doc.hero.body}</p>
            <p className="legal-updated">
              {fill(doc.hero.lastUpdated, { date: lastUpdated })}
            </p>
            <p className="legal-prevailing">{doc.hero.prevailing}</p>
          </div>
        </section>

        <section className="section-light legal-section">
          <div className="legal-layout">
            <aside className="legal-toc" aria-label={doc.tocLabel}>
              <p className="legal-toc-title">{doc.tocTitle}</p>
              <ol>
                {doc.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`}>{s.label}</a>
                  </li>
                ))}
              </ol>
            </aside>

            <div className="legal-body">
              {doc.sections.map((section) => (
                <section key={section.id} id={section.id} className="legal-block">
                  <h2>{section.heading}</h2>
                  {section.blocks.map((block, i) => (
                    <Block key={i} block={block} />
                  ))}
                </section>
              ))}

              {doc.contact && (
                <div className="legal-contact">
                  <h3>{doc.contact.heading}</h3>
                  <p>
                    {doc.contact.bodyBefore}
                    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                    {doc.contact.bodyMiddle}
                    <a href={`tel:${CONTACT_PHONE_HREF}`}>{CONTACT_PHONE}</a>
                    {doc.contact.bodyAfter}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer dict={common.footer} />
    </>
  );
}
