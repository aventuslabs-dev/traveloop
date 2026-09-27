import Image from "next/image";
import { Icon } from "@/app/components/Icons";
import { COLLECTION_POINT } from "@/lib/pass-collection";
import { formatPassNumber } from "@/lib/pass-number";
import { count, fill } from "@/i18n/interpolate";
import type { Dictionary } from "@/i18n/dictionaries";

type CheckoutDict = Dictionary["checkout"];

export type PassNumberEntry = {
  passNumber: string;
  traveller: string;
  /** Tier name, already localised by the caller. */
  passLabel: string;
  /** Formatted date it was handed over, or null while it's waiting at the counter. */
  collectedOn: string | null;
};

/**
 * Each traveller's pass number, big enough to read off a phone at the counter.
 * `tone="card"` sits on the tier-coloured portal pass card and inherits its
 * colours; the default is the white success page.
 */
export function PassNumberList({
  passes,
  dict,
  tone,
  showStatus = false,
}: {
  passes: PassNumberEntry[];
  dict: CheckoutDict["passNumbers"];
  tone?: "card";
  showStatus?: boolean;
}) {
  return (
    <div className={`pass-numbers${tone === "card" ? " on-card" : ""}`}>
      <p className="pass-numbers-label">{count(dict.heading, passes.length)}</p>
      <ul>
        {passes.map((pass) => (
          <li key={pass.passNumber}>
            <span className="pass-numbers-who">
              <b>{pass.traveller}</b>
              <span>{pass.passLabel}</span>
            </span>
            <span className="pass-numbers-right">
              <code className="pass-numbers-code">{formatPassNumber(pass.passNumber)}</code>
              {showStatus && (
                <span className={`pass-numbers-status${pass.collectedOn ? " is-done" : ""}`}>
                  {pass.collectedOn ? fill(dict.collected, { date: pass.collectedOn }) : dict.ready}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Where to pick up the physical pass and what to bring, with a photo so the counter is recognisable on arrival. */
export function CollectionCard({
  dict,
  passCount,
}: {
  dict: CheckoutDict["collection"];
  passCount: number;
}) {
  const steps = passCount > 1 ? dict.steps.other : dict.steps.one;

  return (
    <div className="pass-collect-wrap">
      <section className="pass-collect" aria-label={dict.eyebrow}>
        <div className="pass-collect-photo">
          <Image
            src={COLLECTION_POINT.photo}
            alt={dict.photoAlt}
            width={1280}
            height={960}
            sizes="(max-width: 700px) 100vw, 420px"
          />
        </div>

        <div className="pass-collect-body">
          <p className="pass-collect-eyebrow">{dict.eyebrow}</p>
          <h2>
            {dict.place}
            <span>{dict.area}</span>
          </h2>

          <p className="pass-collect-line">
            <Icon name="pin" />
            {dict.directions}
          </p>
          <p className="pass-collect-line">
            <Icon name="clock" />
            {dict.hours}
          </p>

          <p className="pass-collect-steps-head">{dict.stepsHeading}</p>
          <ol className="pass-collect-steps">
            {steps.map((step, index) => (
              <li key={step}>
                <span aria-hidden="true">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>

          <a
            className="pass-collect-map"
            href={COLLECTION_POINT.mapsUrl}
            target="_blank"
            rel="noreferrer"
          >
            {dict.map}
            <Icon name="arrowRight" />
          </a>
        </div>
      </section>
    </div>
  );
}
