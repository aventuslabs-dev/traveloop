import type { InsuranceBlock, InsuranceDoc } from "@/i18n/legal";

/**
 * Traveloop insurance Terms & Conditions, shown as the third step of the
 * registration flow (src/app/[lang]/passes/register) before the buyer is sent
 * to Stripe.
 *
 * The document itself lives in the dictionaries (`i18n/dictionaries/*\/insurance.ts`)
 * so the buyer reads the contract in the language they are buying in — this
 * file is only the renderer. No props beyond the document, no client JS.
 *
 * Clause numbers come from the array index rather than the copy, so the
 * English and Chinese versions cannot end up numbering the same clause
 * differently.
 */
function Block({ block }: { block: InsuranceBlock }) {
  switch (block.type) {
    case "p":
      return (
        <p>
          {"lead" in block ? <strong>{block.lead}</strong> : null}
          {"lead" in block ? ` ${block.text}` : block.text}
        </p>
      );
    case "ul":
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "table":
      return (
        <table className="terms-table">
          <thead>
            <tr>
              {block.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map(([benefit, amount]) => (
              <tr key={benefit}>
                <td>{benefit}</td>
                <td>{amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
  }
}

export default function InsuranceTerms({ dict }: { dict: InsuranceDoc }) {
  return (
    <div className="terms-doc">
      <h3>{dict.heading}</h3>
      <p className="terms-doc-sub">{dict.sub}</p>

      {dict.governingLanguage ? (
        <p className="terms-doc-note">{dict.governingLanguage}</p>
      ) : null}

      {dict.sections.map((section, index) => (
        <section key={section.heading}>
          <h4>
            {index + 1}. {section.heading}
          </h4>
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </section>
      ))}
    </div>
  );
}
