"use client";

/**
 * Last resort: the root layout itself failed, so this replaces the whole
 * document rather than rendering inside it.
 *
 * Per the Next docs for this file, `global-error` renders its own document and
 * does *not* pick up globals.css or the `next/font` variables — those are
 * applied by the layout that just failed. Everything here is therefore inline,
 * with a system font stack, and nothing is imported. A stylesheet that fails to
 * load would leave this unreadable at the exact moment it is all the visitor
 * has.
 *
 * Bilingual, because there is no locale segment to read at this point: the
 * layout that owns `[lang]` is what broke. Both lines is better than guessing.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>Something went wrong — Traveloop</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#fdfbf7",
          color: "#101a2c",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          lineHeight: 1.6,
        }}
      >
        <main style={{ maxWidth: "480px", textAlign: "center" }}>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "#D72936",
            }}
          >
            Traveloop
          </p>

          <h1 style={{ margin: "0 0 12px", fontSize: "24px", fontWeight: 700 }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 4px", color: "#5a6270" }}>
            This page didn&apos;t load. Please try again.
          </p>
          <p lang="zh-Hans" style={{ margin: "0 0 24px", color: "#5a6270" }}>
            此页面加载失败，请重试。
          </p>

          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                padding: "11px 22px",
                border: 0,
                borderRadius: "999px",
                background: "#244798",
                color: "white",
                fontSize: "14px",
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Try again · 重试
            </button>
            {/*
              A plain anchor, deliberately. `next/link` navigates on the client
              through the same router and root layout that just failed — a full
              document load is the only way out that doesn't depend on the
              broken thing. This is the one place the rule is wrong.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/en"
              style={{
                padding: "11px 22px",
                borderRadius: "999px",
                border: "1px solid rgba(16,26,44,.18)",
                color: "#101a2c",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Home · 首页
            </a>
          </div>

          {error.digest ? (
            <p style={{ marginTop: "24px", fontSize: "12px", color: "#8a92a0" }}>
              Reference: <code>{error.digest}</code>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
