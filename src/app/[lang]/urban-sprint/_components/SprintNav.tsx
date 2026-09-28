"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "./ui";

/**
 * The landing page's bar: the lockup, a live marker while the event is on,
 * and Sign up — the page's one job. It stays out of the way on the way into
 * the game and drops in with the board (the stylesheet watches the stage).
 *
 * The bar never changes height — a sticky element that shrinks on scroll
 * shoves the page under the reader's thumb — only its ground firms up once
 * the page moves.
 */
export default function SprintNav({ live }: { live: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className={`us-nav${scrolled ? " is-scrolled" : ""}`}>
      <div className="us-nav-inner">
        <Wordmark />

        <div className="us-nav-end">
          {live && <span className="us-nav-live">Live now</span>}
          <Link className="us-nav-cta" href="/urban-sprint/book">
            Sign up
            <span className="us-chevrons" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
