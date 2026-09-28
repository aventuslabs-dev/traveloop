"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/app/components/Icons";
import { findTeam, type FindTeamState } from "../actions";

const INITIAL: FindTeamState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="us-btn us-btn-primary us-find-go" type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Finding…" : "Go to my team"}
    </button>
  );
}

/**
 * The landing page's Booking ID box: already booked racers type the ID from
 * their confirmation email and land on their team page (actions.findTeam).
 */
export default function FindTeam() {
  const [state, action] = useActionState(findTeam, INITIAL);
  // Controlled, because React resets a form's fields after its action runs —
  // a failed lookup should leave the ID in the box to be corrected.
  const [value, setValue] = useState("");

  return (
    <section className="us-find" id="find-team" aria-labelledby="us-find-title">
      <div className="us-shell">
        <div className="us-find-card">
          <div className="us-find-copy">
            <span className="us-find-icon" aria-hidden>
              <Icon name="ticket" />
            </span>
            <div>
              <h2 id="us-find-title">Already booked?</h2>
              <p>Enter your Booking ID to open your team page.</p>
            </div>
          </div>

          <form className="us-find-form" action={action} noValidate>
            <label className="us-visually-hidden" htmlFor="us-find-id">
              Booking ID
            </label>
            <input
              id="us-find-id"
              name="id"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="US-ABCD2345"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={state.error ? true : undefined}
              aria-describedby={state.error ? "us-find-error" : undefined}
            />
            <SubmitButton />
          </form>

          {state.error && (
            <p id="us-find-error" className="us-find-error" role="alert">
              {state.error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
