"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  saveDiscount,
  type DiscountFormState,
  type DiscountFormValues,
} from "./discount-actions";

const INITIAL: DiscountFormState = { status: "idle" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="ad-btn ad-btn-primary" type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

/**
 * Create or edit a discount. `id` absent means create. Whether a discount is
 * automatic can only be chosen when creating it (see parse in
 * discount-actions.ts), so on an edit that choice is shown, not offered.
 */
export default function DiscountForm({
  id,
  initial,
  submitLabel,
}: {
  id?: number;
  initial: DiscountFormValues;
  submitLabel: string;
}) {
  const [state, action] = useActionState(saveDiscount, INITIAL);

  // React resets a form after its action runs, so a failed save re-mounts it
  // with what was submitted rather than losing it.
  return (
    <FormBody
      key={state.attempt ?? 0}
      id={id}
      values={state.values ?? initial}
      error={state.error}
      action={action}
      submitLabel={submitLabel}
    />
  );
}

function FormBody({
  id,
  values,
  error,
  action,
  submitLabel,
}: {
  id?: number;
  values: DiscountFormValues;
  error?: string;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  const [automatic, setAutomatic] = useState(values.automatic === "on");
  const [kind, setKind] = useState(values.kind || "percent");
  const editing = id !== undefined;

  return (
    <form action={action}>
      {editing && <input type="hidden" name="id" value={id} />}

      {error && (
        <p className="ad-flash ad-flash-err" role="alert">
          {error}
        </p>
      )}

      {editing ? (
        <p className="ad-panel-note">
          {automatic ? (
            <>
              <strong>Automatic</strong> — comes off every pass on the site, no code needed.
            </>
          ) : (
            <>
              <strong>Code</strong> — buyers type it in the cart; it comes off their whole order.
            </>
          )}
        </p>
      ) : (
        <fieldset className="ad-choice">
          <legend>Type</legend>
          <label>
            <input
              type="radio"
              name="automatic"
              value=""
              checked={!automatic}
              onChange={() => setAutomatic(false)}
            />
            <span>
              <b>Code</b>
              Typed in the cart; comes off the whole order.
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="automatic"
              value="on"
              checked={automatic}
              onChange={() => setAutomatic(true)}
            />
            <span>
              <b>Automatic</b>
              Comes off every pass on the site, no code needed — like the launch discount.
            </span>
          </label>
        </fieldset>
      )}

      <div className="ad-field-grid">
        {!automatic && (
          <label className="admin-field">
            <span>Code</span>
            <input
              name="code"
              defaultValue={values.code}
              placeholder="e.g. SUMMER10"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="is-code"
              required
            />
          </label>
        )}
        <label className="admin-field">
          <span>Label {automatic ? "" : "(optional)"}</span>
          <input
            name="label"
            defaultValue={values.label}
            placeholder={automatic ? "e.g. Launch discount" : "Defaults to the code"}
            maxLength={60}
            required={automatic}
          />
        </label>
      </div>

      <div className="ad-field-grid">
        <label className="admin-field">
          <span>Discount type</span>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="percent">Percentage (%)</option>
            <option value="amount">Fixed amount (MYR)</option>
          </select>
        </label>
        <label className="admin-field">
          <span>
            {kind === "percent"
              ? "Percentage off"
              : automatic
                ? "MYR off each pass"
                : "MYR off the order"}
          </span>
          <input
            name="value"
            type="number"
            inputMode="decimal"
            min="0.01"
            max={kind === "percent" ? 100 : undefined}
            step="0.01"
            defaultValue={values.value}
            placeholder={kind === "percent" ? "10" : "20.00"}
            required
          />
        </label>
      </div>

      <div className="ad-field-grid">
        <label className="admin-field">
          <span>First day (optional)</span>
          <input name="startsOn" type="date" defaultValue={values.startsOn} />
        </label>
        <label className="admin-field">
          <span>Last day (optional)</span>
          <input name="endsOn" type="date" defaultValue={values.endsOn} />
        </label>
        {!automatic && (
          <label className="admin-field">
            <span>Maximum uses (optional)</span>
            <input
              name="maxRedemptions"
              type="number"
              min="1"
              step="1"
              defaultValue={values.maxRedemptions}
              placeholder="Unlimited"
            />
          </label>
        )}
      </div>

      <label className="ad-check">
        <input type="checkbox" name="active" defaultChecked={values.active === "on"} />
        <span>
          <b>Switched on</b>
          {automatic
            ? "Applies to every pass while on and within its dates."
            : "Buyers can use it while on, within its dates and uses."}
        </span>
      </label>

      <div className="ad-form-foot">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
