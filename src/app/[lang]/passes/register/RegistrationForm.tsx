"use client";

import { useState } from "react";
import type { PassKey, PassTier } from "@/app/data/passes";
import {
  NATIONALITIES,
  DOCUMENT_TYPES,
  EMERGENCY_RELATIONSHIPS,
} from "@/lib/registration";
import InsuranceTerms from "@/app/components/InsuranceTerms";
import {
  formatCents,
  formatPercent,
  quoteCart,
  type CartQuote,
  type DiscountRule,
} from "@/lib/pricing";
import { fill } from "@/i18n/interpolate";
import { useLocale } from "@/i18n/Link";
import {
  documentTypeLabelsCn,
  nationalityLabelsCn,
  optionLabel,
  relationshipLabelsCn,
} from "@/app/data/cn/registration";
import type { Locale } from "@/i18n/config";
import type enRegistration from "@/i18n/dictionaries/en/registration";
import type { InsuranceDoc } from "@/i18n/legal";

type RegistrationDict = typeof enRegistration;

type RegistrationFormProps = {
  /** Already priced with `automaticDiscount`. */
  passTiers: PassTier[];
  /** The live launch discount, for the breakdown under the cart. */
  automaticDiscount: DiscountRule | null;
  seedPassKey?: PassKey;
  dict: RegistrationDict;
  /** The insurance contract, in the locale being bought in. */
  insurance: InsuranceDoc;
};

type CartItem = {
  id: string;
  passKey: PassKey;
};

type Fields = {
  fullName: string;
  nationality: string;
  otherNationality: string;
  arrivalDate: string;
  departureDate: string;
  travelDocumentType: string;
  travelDocumentNumber: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  otherRelationship: string;
};

const EMPTY: Fields = {
  fullName: "",
  nationality: "",
  otherNationality: "",
  arrivalDate: "",
  departureDate: "",
  travelDocumentType: "",
  travelDocumentNumber: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelationship: "",
  otherRelationship: "",
};

function newCartItem(passKey: PassKey): CartItem {
  return { id: crypto.randomUUID(), passKey };
}

/**
 * Three-step purchase flow: build a cart of one or more passes, fill in a
 * tourist registration for each one, then a single Terms & Conditions
 * declaration covering the whole order. Only after that does the browser hit
 * /api/checkout and get redirected to Stripe, which is where email and phone
 * are collected.
 *
 * Nothing is persisted between steps — everything rides in component state
 * and is posted in one go at the end.
 */
export default function RegistrationForm({
  passTiers,
  automaticDiscount,
  seedPassKey,
  dict,
  insurance,
}: RegistrationFormProps) {
  const lang = useLocale();
  const [cart, setCart] = useState<CartItem[]>(seedPassKey ? [newCartItem(seedPassKey)] : []);
  const [step, setStep] = useState<"cart" | "details" | "terms">("cart");
  const [activeIndex, setActiveIndex] = useState(0);
  const [registrations, setRegistrations] = useState<Record<string, Fields>>({});
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "redirecting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<DiscountRule | null>(null);
  const [codeStatus, setCodeStatus] = useState<"idle" | "checking">("idle");
  const [codeError, setCodeError] = useState<string | null>(null);

  function tierFor(passKey: PassKey): PassTier {
    return passTiers.find((t) => t.key === passKey)!;
  }

  // A preview: /api/checkout recomputes all of this from list prices.
  const quote = quoteCart(
    cart.map((item) => tierFor(item.passKey).listPriceCents),
    automaticDiscount,
    appliedCode
  );

  async function applyCode() {
    const code = codeInput.trim();
    if (!code || codeStatus === "checking") return;

    setCodeStatus("checking");
    setCodeError(null);
    try {
      const response = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data: { rule?: DiscountRule; error?: string } = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !data.rule) {
        setCodeError(data.error ?? dict.errors.checkoutFailed);
      } else {
        setAppliedCode(data.rule);
        setCodeInput("");
      }
    } catch {
      setCodeError(dict.errors.network);
    } finally {
      setCodeStatus("idle");
    }
  }

  function removeCode() {
    setAppliedCode(null);
    setCodeError(null);
  }

  function addToCart(passKey: PassKey) {
    setCart((prev) => [...prev, newCartItem(passKey)]);
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((item) => item.id !== id));
    setRegistrations((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function fieldsFor(id: string): Fields {
    return registrations[id] ?? EMPTY;
  }

  function setField<K extends keyof Fields>(id: string, key: K, value: Fields[K]) {
    setRegistrations((prev) => ({ ...prev, [id]: { ...fieldsFor(id), [key]: value } }));
  }

  function startDetails() {
    if (cart.length === 0) return;
    setActiveIndex(0);
    setStep("details");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToNextRegistrant(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const fields = fieldsFor(cart[activeIndex].id);
    if (Date.parse(fields.departureDate) < Date.parse(fields.arrivalDate)) {
      setError(dict.errors.dateOrder);
      return;
    }

    if (activeIndex < cart.length - 1) {
      setActiveIndex((i) => i + 1);
    } else {
      setStep("terms");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBackFromDetails() {
    if (activeIndex > 0) {
      setActiveIndex((i) => i - 1);
    } else {
      setStep("cart");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "redirecting" || !accepted) return;

    setStatus("redirecting");
    setError(null);

    const items = cart.map((item) => {
      const fields = fieldsFor(item.id);
      // "Other" is a prompt for free text, not a value worth storing.
      const nationality = fields.nationality === "Other" ? fields.otherNationality.trim() : fields.nationality;
      const relationship =
        fields.emergencyContactRelationship === "Other"
          ? fields.otherRelationship.trim()
          : fields.emergencyContactRelationship;

      return {
        passKey: item.passKey,
        registration: {
          fullName: fields.fullName,
          nationality,
          arrivalDate: fields.arrivalDate,
          departureDate: fields.departureDate,
          travelDocumentType: fields.travelDocumentType,
          travelDocumentNumber: fields.travelDocumentNumber,
          address: fields.address,
          emergencyContactName: fields.emergencyContactName,
          emergencyContactPhone: fields.emergencyContactPhone,
          emergencyContactRelationship: relationship,
          termsAccepted: accepted,
        },
      };
    });

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, discountCode: appliedCode?.code ?? null }),
      });

      const data: { url?: string; error?: string } = await response.json().catch(() => ({}));

      if (!response.ok || !data.url) {
        setError(data.error ?? dict.errors.checkoutFailed);
        setStatus("idle");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError(dict.errors.network);
      setStatus("idle");
    }
  }

  if (step === "cart") {
    return (
      <div className="register-card">
        <p className="register-step">{fill(dict.steps.label, { n: 1, total: 3 })}</p>
        <h2>{dict.cart.heading}</h2>
        <p className="register-lede">{dict.cart.lede}</p>

        <div className="cart-tiers">
          {passTiers.map((tier) => (
            <div className="cart-tier-row" key={tier.key}>
              <div className="cart-tier-row-info">
                <strong>{tier.name}</strong>
                <span className="cart-tier-row-price">
                  {tier.discounted && <s>MYR {tier.originalPrice}</s>}
                  MYR {tier.price}
                </span>
              </div>
              <button type="button" className="button ghost dark" onClick={() => addToCart(tier.key)}>
                {dict.cart.add}
              </button>
            </div>
          ))}
        </div>

        {cart.length === 0 ? (
          <p className="cart-empty">{dict.cart.empty}</p>
        ) : (
          <ul className="cart-list">
            {cart.map((item, index) => (
              <li className="cart-list-item" key={item.id}>
                <span>
                  {fill(dict.cart.lineItem, {
                    index: index + 1,
                    tier: tierFor(item.passKey).name,
                    price: tierFor(item.passKey).price,
                  })}
                </span>
                <button
                  type="button"
                  className="cart-list-remove"
                  onClick={() => removeFromCart(item.id)}
                  aria-label={dict.cart.remove}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {cart.length > 0 && (
          <>
            <div className="cart-code">
              {appliedCode ? (
                <p className="cart-code-applied">
                  <span>{fill(dict.cart.codeApplied, { code: appliedCode.code ?? "" })}</span>
                  <button type="button" className="cart-code-remove" onClick={removeCode}>
                    {dict.cart.removeCode}
                  </button>
                </p>
              ) : (
                <label className="cart-code-field">
                  <span>{dict.cart.codeLabel}</span>
                  <span className="cart-code-row">
                    <input
                      type="text"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void applyCode();
                        }
                      }}
                      placeholder={dict.cart.codePlaceholder}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      aria-invalid={codeError ? true : undefined}
                    />
                    <button
                      type="button"
                      className="button ghost dark"
                      onClick={() => void applyCode()}
                      disabled={!codeInput.trim() || codeStatus === "checking"}
                    >
                      {codeStatus === "checking" ? dict.cart.applying : dict.cart.apply}
                    </button>
                  </span>
                </label>
              )}
              {codeError && (
                <p className="cart-code-error" role="alert">
                  {codeError}
                </p>
              )}
            </div>

            <PriceSummary
              quote={quote}
              count={cart.length}
              automatic={automaticDiscount}
              code={appliedCode}
              dict={dict.cart}
            />
          </>
        )}

        <div className="register-actions">
          <button type="button" className="button primary" onClick={startDetails} disabled={cart.length === 0}>
            {dict.cart.continue}
          </button>
        </div>
      </div>
    );
  }

  if (step === "details") {
    const item = cart[activeIndex];
    const tier = tierFor(item.passKey);
    const fields = fieldsFor(item.id);

    return (
      <form className="register-card" onSubmit={goToNextRegistrant}>
        <p className="register-step">{fill(dict.steps.label, { n: 2, total: 3 })}</p>
        <h2>
          {fill(dict.details.heading, {
            n: activeIndex + 1,
            total: cart.length,
            tier: tier.name,
          })}
        </h2>
        <p className="register-lede">{dict.details.lede}</p>

        <RegistrationFields
          fields={fields}
          set={(key, value) => setField(item.id, key, value)}
          dict={dict.fields}
          lang={lang}
        />

        {error && (
          <p className="checkout-error" role="alert">
            {error}
          </p>
        )}

        <div className="register-actions">
          <button type="button" className="button ghost dark" onClick={goBackFromDetails}>
            {dict.details.back}
          </button>
          <button type="submit" className="button primary">
            {activeIndex < cart.length - 1 ? dict.details.next : dict.details.toTerms}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="register-card" onSubmit={submit}>
      <p className="register-step">{fill(dict.steps.label, { n: 3, total: 3 })}</p>
      <h2>{dict.terms.heading}</h2>
      <p className="register-lede">
        {fill(cart.length === 1 ? dict.terms.ledeOne : dict.terms.ledeMany, {
          count: cart.length,
        })}
      </p>

      <div className="terms-scroll">
        <InsuranceTerms dict={insurance} />
      </div>

      <PriceSummary
        quote={quote}
        count={cart.length}
        automatic={automaticDiscount}
        code={appliedCode}
        dict={dict.cart}
        onRemoveCode={status === "redirecting" ? undefined : removeCode}
      />

      <label className="register-consent">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          required
        />
        <span>{dict.terms.consent}</span>
      </label>

      {error && (
        <p className="checkout-error" role="alert">
          {error}
        </p>
      )}

      <div className="register-actions">
        <button
          type="button"
          className="button ghost dark"
          onClick={() => {
            setActiveIndex(cart.length - 1);
            setStep("details");
          }}
          disabled={status === "redirecting"}
        >
          {dict.terms.back}
        </button>
        <button
          type="submit"
          className="button primary"
          disabled={!accepted || status === "redirecting"}
          aria-busy={status === "redirecting"}
        >
          {status === "redirecting" ? (
            <>
              <span className="checkout-spinner" aria-hidden="true" />
              {dict.terms.redirecting}
            </>
          ) : (
            dict.terms.submit
          )}
        </button>
      </div>
    </form>
  );
}

/**
 * Subtotal, each discount and the total. With no discount at all it collapses
 * to the single total line the cart always had.
 */
function PriceSummary({
  quote,
  count,
  automatic,
  code,
  dict,
  onRemoveCode,
}: {
  quote: CartQuote;
  count: number;
  automatic: DiscountRule | null;
  code: DiscountRule | null;
  dict: RegistrationDict["cart"];
  onRemoveCode?: () => void;
}) {
  const launchLabel =
    automatic?.kind === "percent"
      ? fill(dict.launchPercent, {
          percent: formatPercent(automatic.value),
          zhe: formatPercent((100 - automatic.value) / 10),
        })
      : automatic
        ? fill(dict.launchAmount, { amount: formatCents(automatic.value) })
        : "";
  const hasDiscount = quote.automaticDiscountCents > 0 || code !== null;

  return (
    <div className="cart-summary">
      {hasDiscount && (
        <dl className="cart-summary-lines">
          <div>
            <dt>{dict.subtotal}</dt>
            <dd>MYR {formatCents(quote.subtotalCents)}</dd>
          </div>
          {quote.automaticDiscountCents > 0 && (
            <div className="is-saving">
              <dt>{launchLabel}</dt>
              <dd>− MYR {formatCents(quote.automaticDiscountCents)}</dd>
            </div>
          )}
          {code && (
            <div className="is-saving">
              <dt>
                {fill(dict.codeApplied, { code: code.code ?? "" })}
                {onRemoveCode && (
                  <button type="button" className="cart-code-remove" onClick={onRemoveCode}>
                    {dict.removeCode}
                  </button>
                )}
              </dt>
              <dd>− MYR {formatCents(quote.codeDiscountCents)}</dd>
            </div>
          )}
        </dl>
      )}
      {code && quote.codeDiscountCents === 0 && (
        <p className="cart-code-error">{dict.codeNoEffect}</p>
      )}
      <div className="cart-total">
        <span>{fill(count === 1 ? dict.totalOne : dict.totalMany, { count })}</span>
        <span>MYR {formatCents(quote.totalCents)}</span>
      </div>
    </div>
  );
}

type RegistrationFieldsProps = {
  fields: Fields;
  set: <K extends keyof Fields>(key: K, value: Fields[K]) => void;
  dict: RegistrationDict["fields"];
  lang: Locale;
};

/**
 * Option lists are submitted as their English values and only *displayed*
 * translated — the server validates against that English allow-list and the
 * insurer's records must read the same whichever language the buyer used.
 */
function RegistrationFields({ fields, set, dict, lang }: RegistrationFieldsProps) {
  return (
    <>
      <label className="admin-field">
        <span>{dict.fullName}</span>
        <input
          type="text"
          value={fields.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          autoComplete="name"
          required
        />
      </label>

      <label className="admin-field">
        <span>{dict.nationality}</span>
        <select
          value={fields.nationality}
          onChange={(e) => set("nationality", e.target.value)}
          required
        >
          <option value="">{dict.selectNationality}</option>
          {NATIONALITIES.map((n) => (
            <option key={n} value={n}>
              {optionLabel(n, nationalityLabelsCn, lang)}
            </option>
          ))}
        </select>
      </label>

      {fields.nationality === "Other" && (
        <label className="admin-field">
          <span>{dict.specifyNationality}</span>
          <input
            type="text"
            value={fields.otherNationality}
            onChange={(e) => set("otherNationality", e.target.value)}
            required
          />
        </label>
      )}

      <div className="register-row">
        <label className="admin-field">
          <span>{dict.arrivalDate}</span>
          <input
            type="date"
            value={fields.arrivalDate}
            onChange={(e) => set("arrivalDate", e.target.value)}
            required
          />
        </label>
        <label className="admin-field">
          <span>{dict.departureDate}</span>
          <input
            type="date"
            value={fields.departureDate}
            onChange={(e) => set("departureDate", e.target.value)}
            min={fields.arrivalDate || undefined}
            required
          />
        </label>
      </div>

      <label className="admin-field">
        <span>{dict.documentType}</span>
        <select
          value={fields.travelDocumentType}
          onChange={(e) => set("travelDocumentType", e.target.value)}
          required
        >
          <option value="">{dict.selectDocumentType}</option>
          {DOCUMENT_TYPES.map((d) => (
            <option key={d} value={d}>
              {optionLabel(d, documentTypeLabelsCn, lang)}
            </option>
          ))}
        </select>
      </label>

      <label className="admin-field">
        <span>{dict.documentNumber}</span>
        <input
          type="text"
          value={fields.travelDocumentNumber}
          onChange={(e) => set("travelDocumentNumber", e.target.value)}
          required
        />
      </label>

      <label className="admin-field">
        <span>{dict.address}</span>
        <textarea
          rows={3}
          value={fields.address}
          onChange={(e) => set("address", e.target.value)}
          required
        />
      </label>

      <p className="register-section-label">{dict.emergencySection}</p>

      <label className="admin-field">
        <span>{dict.emergencyName}</span>
        <input
          type="text"
          value={fields.emergencyContactName}
          onChange={(e) => set("emergencyContactName", e.target.value)}
        />
      </label>

      <label className="admin-field">
        <span>{dict.emergencyPhone}</span>
        <input
          type="tel"
          value={fields.emergencyContactPhone}
          onChange={(e) => set("emergencyContactPhone", e.target.value)}
        />
      </label>

      <label className="admin-field">
        <span>{dict.emergencyRelationship}</span>
        <select
          value={fields.emergencyContactRelationship}
          onChange={(e) => set("emergencyContactRelationship", e.target.value)}
        >
          <option value="">{dict.selectRelationship}</option>
          {EMERGENCY_RELATIONSHIPS.map((r) => (
            <option key={r} value={r}>
              {optionLabel(r, relationshipLabelsCn, lang)}
            </option>
          ))}
        </select>
      </label>

      {fields.emergencyContactRelationship === "Other" && (
        <label className="admin-field">
          <span>{dict.specifyRelationship}</span>
          <input
            type="text"
            value={fields.otherRelationship}
            onChange={(e) => set("otherRelationship", e.target.value)}
          />
        </label>
      )}
    </>
  );
}
