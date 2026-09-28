import { formatDuration, points } from "@/lib/urban-sprint/format";
import { clearResultAction, setResultAction } from "./actions";
import ConfirmButton from "./ConfirmButton";

/**
 * Enter or correct one booking's result: total points and completion time.
 * Used on the booking page and in the Results dialogs; `returnTo` brings
 * staff back to where they were working.
 */
export default function ResultForm({
  bookingId,
  reference,
  resultPoints,
  resultSeconds,
  returnTo,
}: {
  bookingId: number;
  reference: string;
  resultPoints: number | null;
  resultSeconds: number | null;
  returnTo: string;
}) {
  const hasResult = resultPoints !== null && resultSeconds !== null;

  return (
    <>
      <form className="usc-inline-form" action={setResultAction}>
        <input type="hidden" name="bookingId" value={bookingId} />
        <input type="hidden" name="reference" value={reference} />
        <input type="hidden" name="returnTo" value={returnTo} />

        <label className="admin-field">
          <span>Total points</span>
          <input
            name="points"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            defaultValue={hasResult ? points(resultPoints) : ""}
            required
          />
        </label>

        <label className="admin-field">
          <span>Completion time</span>
          <input
            name="time"
            placeholder="58:12"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={hasResult ? formatDuration(resultSeconds) : ""}
            required
          />
        </label>

        <button className="ad-btn ad-btn-primary" type="submit">
          {hasResult ? "Update result" : "Save result"}
        </button>
      </form>

      {hasResult && (
        <form className="usc-danger" action={clearResultAction}>
          <input type="hidden" name="bookingId" value={bookingId} />
          <input type="hidden" name="reference" value={reference} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <p>Clearing takes the team off the ranking until a new result is entered.</p>
          <ConfirmButton message={`Clear the result for ${reference}?`}>Clear result</ConfirmButton>
        </form>
      )}
    </>
  );
}
