"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { submitContactForm, type ContactFormState, type SubjectKey } from "./actions";
import { fill } from "@/i18n/interpolate";
import type enCommon from "@/i18n/dictionaries/en/common";
import type enContact from "@/i18n/dictionaries/en/contact";

type ContactDict = typeof enContact;

function Icon({ name }: { name: string }) {
  const svgProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const paths: Record<string, ReactNode> = {
    mail: (
      <>
        <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M3.5 6.5 12 13l8.5-6.5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" />
        <circle cx="12" cy="10" r="2.6" />
      </>
    ),
  };
  return <svg {...svgProps}>{paths[name]}</svg>;
}

const INITIAL_STATE: ContactFormState = { status: "idle" };

/** Lives in its own component so it can read `pending` from the enclosing <form>. */
function SubmitButton({ dict }: { dict: ContactDict["form"] }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="button primary contact-submit"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? dict.sending : dict.send}
    </button>
  );
}

/**
 * The form itself. Reading ?pass= needs useSearchParams, which suspends, so
 * this sits behind a Suspense boundary in the page below.
 */
function ContactForm({ dict }: { dict: ContactDict }) {
  const passParam = useSearchParams().get("pass");
  const [state, formAction] = useActionState(submitContactForm, INITIAL_STATE);

  const subjectKeys = Object.keys(dict.subjects) as SubjectKey[];

  // Prefilled from ?pass=gold, then owned by the visitor once they type.
  const [subject, setSubject] = useState<SubjectKey>(passParam ? "pricing" : "general");
  const [message, setMessage] = useState(
    passParam ? fill(dict.form.passPrefill, { pass: passParam }) : ""
  );

  if (state.status === "sent") {
    return (
      <div className="contact-form">
        <div className="contact-form-success" role="status">
          <span className="contact-form-success-icon">✓</span>
          <strong>{dict.form.successTitle}</strong>
          <p>{dict.form.successBody}</p>
        </div>
      </div>
    );
  }

  return (
    <form className="contact-form" action={formAction}>
      {/* Honeypot — hidden from people, irresistible to bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="contact-honeypot"
      />

      <div className="form-row">
        <label className="form-field">
          <span>{dict.form.name}</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            placeholder={dict.form.namePlaceholder}
            maxLength={120}
            required
          />
        </label>
        <label className="form-field">
          <span>{dict.form.email}</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder={dict.form.emailPlaceholder}
            maxLength={200}
            required
          />
        </label>
      </div>

      <label className="form-field">
        <span>{dict.form.subject}</span>
        {/* The value is the stable key; only the label follows the locale. */}
        <select
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value as SubjectKey)}
        >
          {subjectKeys.map((key) => (
            <option key={key} value={key}>
              {dict.subjects[key]}
            </option>
          ))}
        </select>
      </label>

      <label className="form-field">
        <span>{dict.form.message}</span>
        <textarea
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={dict.form.messagePlaceholder}
          rows={5}
          maxLength={4000}
          required
        />
      </label>

      {state.status === "error" && (
        <p className="checkout-error" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton dict={dict.form} />
    </form>
  );
}

export default function ContactPageClient({
  dict,
  nav,
  language,
  footer,
}: {
  dict: ContactDict;
  nav: typeof enCommon.nav;
  language: typeof enCommon.language;
  footer: typeof enCommon.footer;
}) {
  return (
    <>
      <Navbar dict={nav} language={language} forceScrolled />
      <main id="main">
        <section className="arrival section-light contact-hero">
          <div className="section-heading centered">
            <p className="eyebrow">{dict.hero.eyebrow}</p>
            <h2>
              {dict.hero.headingLead}
              <br />
              <em>{dict.hero.headingEm}</em>
            </h2>
            <p>{dict.hero.body}</p>
          </div>

          <div className="contact-panel">
            <div className="contact-grid">
              <div className="contact-info">
                <a
                  className="contact-card"
                  href="https://wa.me/601139492888"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="contact-card-icon whatsapp">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                  </span>
                  <span className="contact-card-body">
                    <strong>{dict.cards.whatsappTitle}</strong>
                    <span>+6011-3949-2888</span>
                  </span>
                </a>

                <a className="contact-card" href="mailto:hello@traveloop.my">
                  <span className="contact-card-icon">
                    <Icon name="mail" />
                  </span>
                  <span className="contact-card-body">
                    <strong>{dict.cards.emailTitle}</strong>
                    <span>hello@traveloop.my</span>
                  </span>
                </a>

                <div className="contact-card static">
                  <span className="contact-card-icon">
                    <Icon name="clock" />
                  </span>
                  <span className="contact-card-body">
                    <strong>{dict.cards.responseTitle}</strong>
                    <span>{dict.cards.responseValue}</span>
                  </span>
                </div>

                <div className="contact-card static">
                  <span className="contact-card-icon">
                    <Icon name="pin" />
                  </span>
                  <span className="contact-card-body">
                    <strong>{dict.cards.basedTitle}</strong>
                    <span>{dict.cards.basedValue}</span>
                  </span>
                </div>

                <p className="contact-info-note">{dict.cards.note}</p>
              </div>

              <Suspense fallback={<div className="contact-form" />}>
                <ContactForm dict={dict} />
              </Suspense>
            </div>
          </div>
        </section>
      </main>
      <Footer dict={footer} />
    </>
  );
}
