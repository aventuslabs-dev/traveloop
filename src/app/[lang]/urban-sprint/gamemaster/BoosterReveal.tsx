"use client";

import { useEffect, useState } from "react";
import { percent } from "@/lib/urban-sprint/format";
import type { Booster } from "@/lib/urban-sprint/types";

/**
 * The booster reveal — the one genuinely theatrical moment in the product.
 *
 * It plays once, right after the draw, and only because the redirect carried
 * `drawn=1`; landing on the dashboard any other way shows the booster as a
 * plain card. The animation is CSS (see .us-reveal), so this component only
 * owns the "has it been dismissed" state, and it self-dismisses after a few
 * seconds so a gamemaster who has already started walking isn't left with an
 * overlay to clear.
 */
export default function BoosterReveal({ booster }: { booster: Booster }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setOpen(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div className="us-reveal" role="dialog" aria-label="Your booster">
      <div className="us-reveal-glow" aria-hidden />

      <div className="us-reveal-card" style={{ "--cat": booster.categoryColor } as React.CSSProperties}>
        <p className="us-reveal-eyebrow">Your booster</p>
        <p className="us-reveal-name">{booster.name}</p>
        <p className="us-reveal-cat">{booster.categoryName}</p>
        <p className="us-reveal-bonus">+{percent(booster.bonusPercent)}</p>
        {booster.description && <p className="us-reveal-desc">{booster.description}</p>}
        <p className="us-reveal-rule">
          Every {booster.categoryName} station pays {percent(booster.bonusPercent)} more for your
          team.
        </p>

        <button className="us-btn us-btn-primary us-btn-block" type="button" onClick={() => setOpen(false)}>
          Let&rsquo;s go
        </button>
      </div>
    </div>
  );
}
