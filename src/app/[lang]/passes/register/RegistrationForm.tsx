"use client";

import { useState } from "react";
import type { PassKey, PassTier } from "@/app/data/passes";
import {
  NATIONALITIES,
  DOCUMENT_TYPES,
  EMERGENCY_RELATIONSHIPS,
} from "@/lib/registration";
import InsuranceTerms from "@/app/components/InsuranceTerms";
import { fill } from "@/i18n/interpolate";
import { useLocale } from "@/i18n/Link";
import {
  documentTypeLabelsCn,
  nationalityLabelsCn,
  relationshipLabelsCn,
} from "@/app/data/cn/registration";
import type { Locale } from "@/i18n/config";
import type enRegistration from "@/i18n/dictionaries/en/registration";

type RegistrationDict = typeof enRegistration;

type RegistrationFormProps = {
  passTiers: PassTier[];
  seedPassKey?: PassKey;
  dict: RegistrationDict;
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
  seedPassKey,
  dict,
}: RegistrationFormProps) {
  const lang = useLocale();
  const [cart, setCart] = useState<CartItem[]>(seedPassKey ? [newCartItem(seedPassKey)] : []);
  const [step, setStep] = useState<"cart" | "details" | "terms">("cart");
  const [activeIndex, setActiveIndex] = useState(0);
  const [registrations, setRegistrations] = useState<Record<string, Fields>>({});
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "redirecting">("idle");
  const [error, setError] = useState<string | null>(null);

  function tierFor(passKey: PassKey): PassTier {
    return passTiers.find((t) => t.key === passKey)!;
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
      setError(dict.details.dateOrder);
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
        body: JSON.stringify({ items }),
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
    const total = cart.reduce((sum, item) => sum + tierFor(item.passKey).priceCents, 0);

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
                <span className="cart-tier-row-price">MYR {tier.price}</span>
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
          <div className="cart-total">
            <span>
              {fill(cart.length === 1 ? dict.cart.totalOne : dict.cart.totalMany, {
                count: cart.length,
              })}
            </span>
            <span>MYR {(total / 100).toFixed(2)}</span>
          </div>
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
        <InsuranceTerms />
      </div>

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
function optionLabel(value: string, labels: Record<string, string>, lang: Locale): string {
  return lang === "cn" ? labels[value] ?? value : value;
}

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
