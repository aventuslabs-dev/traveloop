"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

/**
 * What a modal sheet owes the keyboard: focus moves into it when it opens,
 * Tab stays inside it, Escape closes it, and focus goes back to whatever
 * opened it when it closes.
 *
 * `onClose` is read through a ref, so a caller passing a fresh function each
 * render doesn't re-run the effect (which would bounce focus). Pass null to
 * refuse Escape for a moment — a confirm in flight, say.
 */
export function useSheet(ref: RefObject<HTMLElement | null>, onClose: (() => void) | null) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const sheet = ref.current;
    if (!sheet) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // A field with autoFocus has already taken focus; don't steal it back.
    if (!sheet.contains(document.activeElement)) sheet.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (close.current) {
          event.preventDefault();
          close.current();
        }
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (item) => item.offsetParent !== null || item === document.activeElement,
      );
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === sheet)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !sheet.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [ref]);
}
