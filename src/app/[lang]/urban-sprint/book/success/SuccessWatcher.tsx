"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Must match DRAFT_KEY in BookingForm. */
const DRAFT_KEY = "us-booking-draft";

const POLL_MS = 3000;
const MAX_POLLS = 20;

/**
 * Two small jobs the success page can't do from the server.
 *
 * `confirmed`: drop the form copy the booking page parked in session storage —
 * it holds identity numbers, and the booking it was for is done.
 *
 * Otherwise, re-render every few seconds for about a minute: Stripe sends the
 * buyer back here at the same moment it sends the webhook, so the booking is
 * often a beat behind the page.
 */
export default function SuccessWatcher({ confirmed }: { confirmed: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (confirmed) {
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // Nothing to clear, or storage unavailable — either way, nothing to do.
      }
      return;
    }

    let polls = 0;
    const timer = window.setInterval(() => {
      polls += 1;
      if (polls > MAX_POLLS) window.clearInterval(timer);
      else router.refresh();
    }, POLL_MS);

    return () => window.clearInterval(timer);
  }, [confirmed, router]);

  return null;
}
