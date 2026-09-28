import SubmitButton from "../_components/SubmitButton";

/**
 * Finish is final — the clock can't be restarted — so it asks first. A
 * mis-tap mid-race would otherwise end the team's race early.
 */
export default function FinishRaceButton() {
  return (
    <SubmitButton
      className="us-btn us-btn-ghost us-btn-block"
      pendingLabel="Finishing…"
      confirm="Finish the race now? The clock stops and your time is final."
    >
      Finish race
    </SubmitButton>
  );
}
