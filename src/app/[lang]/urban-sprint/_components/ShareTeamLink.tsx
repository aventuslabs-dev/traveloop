"use client";

import { useState } from "react";

/**
 * Copies a link, and says so for a moment. Used for a team's private page
 * link here and in the console.
 */
export function CopyButton({
  text,
  className,
  label = "Copy link",
}: {
  text: string;
  className: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused (an insecure origin, a browser
      // setting); the link is on screen to copy by hand.
    }
  }

  return (
    <button className={className} type="button" onClick={copy}>
      {copied ? "Copied" : label}
    </button>
  );
}

/**
 * A team's private page link, ready to send to the rest of the team — most
 * teams will pass it round a WhatsApp group, so that's the one share button.
 */
export default function ShareTeamLink({ url, teamName }: { url: string; teamName: string }) {
  const message = `${teamName} — our Urban Sprint team page: ${url}`;

  return (
    <div className="us-teamlink">
      <input
        className="us-teamlink-url"
        value={url}
        readOnly
        aria-label="Team page link"
        onFocus={(event) => event.currentTarget.select()}
      />
      <div className="us-teamlink-actions">
        <CopyButton text={url} className="us-btn us-btn-ghost" />
        <a
          className="us-btn us-btn-primary"
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on WhatsApp
        </a>
        <a className="us-btn us-btn-ghost" href={url}>
          Open
        </a>
      </div>
    </div>
  );
}
