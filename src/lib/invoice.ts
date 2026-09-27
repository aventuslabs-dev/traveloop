import PDFDocument from "pdfkit";
import type { StoredOrder } from "./orders-db";
import type { IssuedPassItem } from "./pass-registrations-db";
import { LOGO_HEIGHT, LOGO_WIDTH, logoDataUri, logoPngBuffer } from "./invoice-logo";
import { formatPassNumber } from "./pass-number";
import { COLLECTION_POINT, collectionSteps } from "./pass-collection";

export type InvoiceLineItem = {
  label: string;
  /** A second, smaller line under the label: who the pass is for and its number. */
  detail?: string;
  amountCents: number;
};

/** Issuer details, as published on /terms and in the site footer. */
const ISSUER = {
  company: "Seni Mega Venture Sdn Bhd",
  tradingAs: "Traveloop",
  address: ["50, Jalan Khaw Sim Bee", "10400 Georgetown, Pulau Pinang", "Malaysia"],
  email: "traveloop@3d-group.com.my",
  phone: "+6011-3949-2888",
  licence: "MOTAC Licence — No Siri: P00266 / No. Licence: 0584",
};

const BRAND = {
  blue: "#244798",
  deepBlue: "#071b3a",
  ink: "#101a2c",
  muted: "#687187",
  line: "#d5dae4",
  headerFill: "#eef1f7",
  white: "#ffffff",
};

/** One row per pass when available, falling back to a single summary row for legacy orders. */
export function invoiceLineItemsFor(order: StoredOrder, items: IssuedPassItem[]): InvoiceLineItem[] {
  if (items.length === 0) {
    return [{ label: `Traveloop ${order.passName} Pass`, amountCents: order.amountTotal }];
  }

  return items.map((item) => ({
    label: `Traveloop ${item.passName} Pass`,
    // Number first: the PDF truncates this line with an ellipsis, and a long
    // name must never be what pushes the pass number out of sight.
    detail: [
      item.passNumber ? `Pass No. ${formatPassNumber(item.passNumber)}` : null,
      item.registration.fullName,
    ]
      .filter(Boolean)
      .join("  ·  "),
    // At list price, so the discounts below can be itemised against it.
    // Passes sold before discounts existed have no list price, and their
    // unit price already is the whole story.
    amountCents: item.listAmountCents ?? item.unitAmountCents,
  }));
}

/**
 * Subtotal and one negative row per discount, between the passes and the
 * total — empty when the order had no discount, keeping older invoices as
 * they were. Worded from the order itself, as recorded at purchase.
 */
function discountRowsFor(
  order: StoredOrder,
  lineItems: InvoiceLineItem[]
): { label: string; amount: string; style: "item" | "subtotal" }[] {
  const { automaticLabel, automaticCents, codeLabel, codeCents } = order.discount;
  if (automaticCents === 0 && codeCents === 0) return [];

  const subtotal = lineItems.reduce((sum, item) => sum + item.amountCents, 0);
  // A plain hyphen: the PDF's built-in fonts have no U+2212 minus sign.
  const less = (cents: number) => `- ${money(cents, order.currency)}`;

  return [
    { label: "Subtotal", amount: money(subtotal, order.currency), style: "subtotal" },
    ...(automaticCents > 0
      ? [{ label: automaticLabel ?? "Discount", amount: less(automaticCents), style: "item" as const }]
      : []),
    ...(codeCents > 0
      ? [
          {
            label: `Discount code ${codeLabel ?? order.discount.code ?? ""}`.trim(),
            amount: less(codeCents),
            style: "item" as const,
          },
        ]
      : []),
  ];
}

/** The "Pass Collection" rows — where to go, when, and what to bring. */
function collectionRowsFor(order: StoredOrder): { label: string; value: string }[] {
  return [
    { label: "Collection Point", value: `${COLLECTION_POINT.place}. ${COLLECTION_POINT.directions}` },
    { label: "Opening Hours", value: COLLECTION_POINT.hours },
    { label: "Please Bring", value: collectionSteps(order.quantity).join(" ") },
  ];
}

function money(amountMinor: number, currency: string): string {
  const amount = (amountMinor / 100).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency.toUpperCase()} ${amount}`;
}

function longDate(value: string): string {
  return new Date(value).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The label/value pairs describing what was bought, shown above the priced
 * line items. Entries with no data for this order are dropped.
 */
function bookingDetailsFor(order: StoredOrder): { label: string; value: string }[] {
  const rows = [{ label: "Pass", value: `Traveloop ${order.passName} Pass` }];

  if (order.arrivalDate && order.departureDate) {
    rows.push({
      label: "Travel Period",
      value: `${longDate(order.arrivalDate)} – ${longDate(order.departureDate)}`,
    });
  } else if (order.arrivalDate) {
    rows.push({ label: "Arrival Date", value: longDate(order.arrivalDate) });
  }

  rows.push({ label: "Quantity", value: `${order.quantity} pass${order.quantity === 1 ? "" : "es"}` });
  // The Stripe session id used to appear here as the order reference. It's 66
  // characters of noise to read out over the phone, and "Receipt No." above
  // already identifies the order, so the reference customers quote is that.
  return rows;
}

function customerRowsFor(order: StoredOrder): { label: string; value: string }[] {
  const rows = [
    { label: "Name", value: order.customerName ?? "Guest" },
    { label: "Email Address", value: order.customerEmail ?? "—" },
  ];
  if (order.customerPhone) rows.push({ label: "Phone", value: order.customerPhone });
  return rows;
}

/** Self-contained, printable HTML invoice — used both as an email attachment body and a standalone page. */
export function buildInvoiceHtml(order: StoredOrder, lineItems: InvoiceLineItem[]): string {
  const issued = longDate(order.createdAt);
  const details = bookingDetailsFor(order);
  const customer = customerRowsFor(order);

  const labelledRows = (rows: { label: string; value: string }[]) =>
    rows
      .map(
        (row) => `<tr>
          <th scope="row">${escapeHtml(row.label)}</th>
          <td colspan="2">${escapeHtml(row.value)}</td>
        </tr>`
      )
      .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Receipt ${escapeHtml(order.invoiceNumber)} — Traveloop</title>
<style>
  :root {
    --blue: ${BRAND.blue};
    --deep-blue: ${BRAND.deepBlue};
    --ink: ${BRAND.ink};
    --muted: ${BRAND.muted};
    --line: ${BRAND.line};
    --header-fill: ${BRAND.headerFill};
  }
  * { box-sizing: border-box; }
  body {
    font-family: "DM Sans", -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    color: var(--ink);
    background: #eef0f4;
    margin: 0;
    padding: 32px 16px;
    font-size: 14px;
    line-height: 1.45;
  }
  .sheet {
    max-width: 780px;
    margin: 0 auto;
    background: #fff;
    padding: 48px 44px 36px;
    box-shadow: 0 18px 48px rgba(7, 27, 58, 0.1);
  }
  .masthead { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
  .masthead img { width: 186px; height: auto; }
  .title { text-align: right; }
  .title h1 {
    margin: 0;
    font-size: 30px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--blue);
    font-weight: 700;
  }
  .meta { display: flex; justify-content: space-between; align-items: flex-start; gap: 32px; margin-top: 32px; }
  .issuer { font-size: 13px; color: var(--muted); }
  .issuer strong { display: block; color: var(--ink); font-size: 14px; margin-bottom: 2px; }
  .eyebrow {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px;
  }
  .stamp { border: 1px solid var(--line); min-width: 268px; margin: 0; }
  .stamp div { display: flex; border-bottom: 1px solid var(--line); }
  .stamp div:last-child { border-bottom: 0; }
  .stamp dt {
    width: 118px;
    flex: none;
    margin: 0;
    padding: 9px 12px;
    background: var(--header-fill);
    border-right: 1px solid var(--line);
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
  }
  .stamp dd { margin: 0; padding: 9px 12px; font-size: 13px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 28px; border: 1px solid var(--line); }
  caption, .section-head {
    background: var(--header-fill);
    border-bottom: 1px solid var(--line);
    padding: 9px 12px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--deep-blue);
  }
  th, td { padding: 9px 12px; border-bottom: 1px solid var(--line); vertical-align: top; font-size: 13px; }
  tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
  th[scope="row"] {
    width: 168px;
    text-align: left;
    font-weight: 600;
    color: var(--muted);
    border-right: 1px solid var(--line);
  }
  .amount { width: 150px; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .items thead th {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    text-align: left;
    color: var(--deep-blue);
    background: var(--header-fill);
  }
  .items thead th.amount { text-align: right; }
  .item-detail { display: block; margin-top: 2px; font-size: 12px; color: var(--muted); }
  .subtotal td, .subtotal th { font-weight: 600; }
  .grand th, .grand td {
    background: var(--blue);
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.06em;
    border-bottom: 0;
  }
  footer { margin-top: 28px; border-top: 1px solid var(--line); padding-top: 14px; font-size: 11px; color: var(--muted); }
  footer p { margin: 0 0 4px; }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; max-width: none; padding: 0; }
  }
  @media (max-width: 640px) {
    .sheet { padding: 28px 20px; }
    .masthead, .meta { flex-direction: column; }
    .title { text-align: left; }
    .stamp { min-width: 0; }
  }
</style>
</head>
<body>
  <main class="sheet">
    <div class="masthead">
      <img src="${logoDataUri}" alt="Traveloop" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" />
      <div class="title">
        <h1>Receipt</h1>
      </div>
    </div>

    <div class="meta">
      <div class="issuer">
        <div class="eyebrow">Issued by</div>
        <strong>${escapeHtml(ISSUER.company)}</strong>
        trading as ${escapeHtml(ISSUER.tradingAs)}<br />
        ${ISSUER.address.map(escapeHtml).join("<br />")}<br />
        ${escapeHtml(ISSUER.email)}<br />
        ${escapeHtml(ISSUER.phone)}
      </div>
      <dl class="stamp">
        <div><dt>Receipt No.</dt><dd>${escapeHtml(order.invoiceNumber)}</dd></div>
        <div><dt>Payment Date</dt><dd>${escapeHtml(issued)}</dd></div>
      </dl>
    </div>

    <table>
      <caption>Customer Name &amp; Address</caption>
      <tbody>
        ${labelledRows(customer)}
      </tbody>
    </table>

    <table class="items">
      <thead>
        <tr>
          <th colspan="2">Description</th>
          <th class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${details
          .map(
            (row) => `<tr>
          <th scope="row">${escapeHtml(row.label)}</th>
          <td colspan="2">${escapeHtml(row.value)}</td>
        </tr>`
          )
          .join("\n")}
        ${lineItems
          .map(
            (item) => `<tr>
          <td colspan="2">${escapeHtml(item.label)}${
            item.detail ? `<span class="item-detail">${escapeHtml(item.detail)}</span>` : ""
          }</td>
          <td class="amount">${money(item.amountCents, order.currency)}</td>
        </tr>`
          )
          .join("\n")}
        ${discountRowsFor(order, lineItems)
          .map(
            (row) => `<tr${row.style === "subtotal" ? ' class="subtotal"' : ""}>
          <td colspan="2">${escapeHtml(row.label)}</td>
          <td class="amount">${escapeHtml(row.amount)}</td>
        </tr>`
          )
          .join("\n")}
        <tr class="subtotal">
          <td colspan="2">Total Charge</td>
          <td class="amount">${money(order.amountTotal, order.currency)}</td>
        </tr>
        <tr class="grand">
          <td colspan="2">GRAND TOTAL</td>
          <td class="amount">${money(order.amountTotal, order.currency)}</td>
        </tr>
      </tbody>
    </table>

    <table>
      <caption>Pass Collection</caption>
      <tbody>
        ${labelledRows(collectionRowsFor(order))}
      </tbody>
    </table>

    <footer>
      <p>This email is auto generated and is valid without a signature.</p>
    </footer>
  </main>
</body>
</html>`;
}

/**
 * Same receipt as buildInvoiceHtml, laid out for A4 — this is what gets
 * attached to the confirmation email. Normally one page; a long order spills
 * onto further pages and the footer follows onto the last of them.
 */
export function buildInvoicePdf(order: StoredOrder, lineItems: InvoiceLineItem[]): Promise<Buffer> {
  const issued = longDate(order.createdAt);

  return new Promise((resolve, reject) => {
    const margin = 46;
    const doc = new PDFDocument({ size: "A4", margin, info: { Title: `Receipt ${order.invoiceNumber}` } });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = margin;
    const width = doc.page.width - margin * 2;
    const right = left + width;

    // ---- Masthead: wordmark left, "RECEIPT" right -------------------------
    const logoWidth = 150;
    doc.image(logoPngBuffer(), left, margin, { width: logoWidth });

    doc
      .fillColor(BRAND.blue)
      .font("Helvetica-Bold")
      .fontSize(26)
      .text("RECEIPT", left, margin - 2, { width, align: "right", characterSpacing: 3 });

    // ---- Issuer block (left) and receipt stamp (right) --------------------
    const metaTop = margin + LOGO_HEIGHT * (logoWidth / LOGO_WIDTH) + 26;

    doc
      .fillColor(BRAND.muted)
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .text("ISSUED BY", left, metaTop, { characterSpacing: 1.2 });
    doc
      .fillColor(BRAND.ink)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(ISSUER.company, left, metaTop + 12);
    doc
      .fillColor(BRAND.muted)
      .font("Helvetica")
      .fontSize(9)
      .text(`trading as ${ISSUER.tradingAs}`, left, doc.y + 1);
    for (const line of [...ISSUER.address, ISSUER.email, ISSUER.phone]) {
      doc.text(line, left, doc.y + 1);
    }
    // Captured before the stamp box below moves `doc.y` back up to its own rows.
    const issuerBottom = doc.y;

    const stampWidth = 244;
    const stampLabelWidth = 104;
    const stampRowHeight = 22;
    const stampLeft = right - stampWidth;
    for (const [index, [label, value]] of (
      [
        ["Receipt No.", order.invoiceNumber],
        ["Payment Date", issued],
      ] as const
    ).entries()) {
      const rowTop = metaTop + index * stampRowHeight;
      doc.rect(stampLeft, rowTop, stampLabelWidth, stampRowHeight).fill(BRAND.headerFill);
      doc
        .rect(stampLeft, rowTop, stampWidth, stampRowHeight)
        .lineWidth(0.7)
        .strokeColor(BRAND.line)
        .stroke();
      doc
        .moveTo(stampLeft + stampLabelWidth, rowTop)
        .lineTo(stampLeft + stampLabelWidth, rowTop + stampRowHeight)
        .stroke();
      doc
        .fillColor(BRAND.muted)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(label, stampLeft + 10, rowTop + 7, { width: stampLabelWidth - 16 });
      doc
        .fillColor(BRAND.ink)
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text(value, stampLeft + stampLabelWidth + 10, rowTop + 7, {
          width: stampWidth - stampLabelWidth - 16,
        });
    }

    // ---- Shared table primitives -----------------------------------------
    const padX = 10;
    const padY = 7;
    const labelWidth = 152;
    const amountWidth = 118;
    const amountLeft = right - amountWidth;
    /** Rows stop here so they never run into the pinned footer. */
    const contentBottom = doc.page.height - margin - 40;

    /** Starts a new page when `height` would not fit, returning the y to draw at. */
    function fit(top: number, height: number): number {
      if (top + height <= contentBottom) return top;
      doc.addPage();
      return margin;
    }

    /**
     * A full-width banner row (the grey caption above each table). `keepWith`
     * is how much of what follows must fit on the same page, so a short
     * section moves to the next page whole instead of splitting.
     */
    function sectionHead(start: number, text: string, keepWith = 22): number {
      const height = 21;
      const top = fit(start, height + keepWith);
      doc.rect(left, top, width, height).fill(BRAND.headerFill);
      doc.rect(left, top, width, height).lineWidth(0.7).strokeColor(BRAND.line).stroke();
      doc
        .fillColor(BRAND.deepBlue)
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .text(text.toUpperCase(), left + padX, top + 6.5, { characterSpacing: 1 });
      return top + height;
    }

    /** Measures then draws a `label | value` row, returning the next y. */
    function labelRow(start: number, label: string, value: string, mono = false): number {
      const valueLeft = left + labelWidth;
      const valueWidth = width - labelWidth - padX * 2;
      doc.font(mono ? "Courier" : "Helvetica").fontSize(mono ? 8.5 : 9.5);
      const height = Math.max(doc.heightOfString(value, { width: valueWidth }) + padY * 2, 22);
      const top = fit(start, height);

      doc.rect(left, top, width, height).lineWidth(0.7).strokeColor(BRAND.line).stroke();
      doc
        .moveTo(valueLeft, top)
        .lineTo(valueLeft, top + height)
        .stroke();
      doc
        .fillColor(BRAND.muted)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(label, left + padX, top + padY, { width: labelWidth - padX * 2 });
      doc
        .fillColor(BRAND.ink)
        .font(mono ? "Courier" : "Helvetica")
        .fontSize(mono ? 8.5 : 9.5)
        .text(value, valueLeft + padX, top + padY, { width: valueWidth });
      return top + height;
    }

    /** A priced row: description (and optional detail line) on the left, right-aligned amount on the right. */
    function amountRow(
      start: number,
      label: string,
      amount: string,
      style: "item" | "subtotal" | "grand" = "item",
      detail?: string
    ): number {
      const height = style === "grand" ? 28 : detail ? 35 : 22;
      const top = fit(start, height);
      const bold = style !== "item";
      const textTop = detail ? top + padY : top + (height - (style === "grand" ? 11 : 9.5)) / 2 - 1;

      if (style === "grand") {
        doc.rect(left, top, width, height).fill(BRAND.blue);
      } else {
        doc.rect(left, top, width, height).lineWidth(0.7).strokeColor(BRAND.line).stroke();
        doc
          .moveTo(amountLeft, top)
          .lineTo(amountLeft, top + height)
          .stroke();
      }

      const ink = style === "grand" ? BRAND.white : BRAND.ink;
      doc
        .fillColor(ink)
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(style === "grand" ? 11 : 9.5)
        .text(label, left + padX, textTop, { width: width - amountWidth - padX * 2 });
      if (detail) {
        doc
          .fillColor(BRAND.muted)
          .font("Helvetica")
          .fontSize(8.5)
          .text(detail, left + padX, textTop + 13, {
            width: width - amountWidth - padX * 2,
            height: 11,
            ellipsis: true,
          });
      }
      doc
        .fillColor(ink)
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(style === "grand" ? 11 : 9.5)
        .text(amount, amountLeft, textTop, { width: amountWidth - padX, align: "right" });
      return top + height;
    }

    // ---- Customer ---------------------------------------------------------
    let y = Math.max(issuerBottom, metaTop + stampRowHeight * 2) + 26;
    y = sectionHead(y, "Customer Name & Address");
    for (const row of customerRowsFor(order)) {
      y = labelRow(y, row.label, row.value);
    }

    // ---- Description / amount --------------------------------------------
    y += 22;
    const headTop = y;
    const headHeight = 21;
    doc.rect(left, headTop, width, headHeight).fill(BRAND.headerFill);
    doc.rect(left, headTop, width, headHeight).lineWidth(0.7).strokeColor(BRAND.line).stroke();
    doc
      .moveTo(amountLeft, headTop)
      .lineTo(amountLeft, headTop + headHeight)
      .stroke();
    doc.fillColor(BRAND.deepBlue).font("Helvetica-Bold").fontSize(8.5);
    doc.text("DESCRIPTION", left + padX, headTop + 6.5, { characterSpacing: 1 });
    doc.text("AMOUNT", amountLeft, headTop + 6.5, {
      width: amountWidth - padX,
      align: "right",
      characterSpacing: 1,
    });
    y = headTop + headHeight;

    for (const row of bookingDetailsFor(order)) {
      y = labelRow(y, row.label, row.value);
    }
    for (const item of lineItems) {
      y = amountRow(y, item.label, money(item.amountCents, order.currency), "item", item.detail);
    }
    for (const row of discountRowsFor(order, lineItems)) {
      y = amountRow(y, row.label, row.amount, row.style);
    }
    y = amountRow(y, "Total Charge", money(order.amountTotal, order.currency), "subtotal");
    y = amountRow(y, "GRAND TOTAL", money(order.amountTotal, order.currency), "grand");

    // ---- Where to collect the physical pass -------------------------------
    // Three short rows — ~36pt each at most, the first wrapping to two lines.
    const collectionRows = collectionRowsFor(order);
    y = sectionHead(y + 22, "Pass Collection", collectionRows.length * 36);
    for (const row of collectionRows) {
      y = labelRow(y, row.label, row.value);
    }

    // ---- Footer, pinned to the bottom of the page -------------------------
    const footTop = doc.page.height - margin - 22;
    doc
      .moveTo(left, footTop)
      .lineTo(right, footTop)
      .lineWidth(0.7)
      .strokeColor(BRAND.line)
      .stroke();
    doc
      .fillColor(BRAND.muted)
      .font("Helvetica")
      .fontSize(8)
      .text("This email is auto generated and is valid without a signature.", left, footTop + 10, { width });

    doc.end();
  });
}
