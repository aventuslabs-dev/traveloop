/* Layout primitives for the Urban Sprint console. Server-safe, so every admin
   screen stays a Server Component and the only client code here is the rail. */

export function AdminHead({
  title,
  note,
  actions,
}: {
  title: string;
  note?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="us-adminhead">
      <div>
        <h1>{title}</h1>
        {note && <p>{note}</p>}
      </div>
      {actions && <div className="us-adminhead-actions">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  note,
  count,
  actions,
  flush = false,
  children,
}: {
  title?: string;
  note?: string;
  count?: string | number;
  actions?: React.ReactNode;
  /** Off-padding for tables, which manage their own gutters. */
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="us-adminpanel">
      {title && (
        <header className="us-adminpanel-head">
          <div>
            <h2>{title}</h2>
            {note && <p>{note}</p>}
          </div>
          {count !== undefined && <span className="us-adminpanel-count">{count}</span>}
          {actions}
        </header>
      )}
      <div className={flush ? "us-adminpanel-flush" : "us-adminpanel-body"}>{children}</div>
    </section>
  );
}

/**
 * Renders the flash carried back by an action's redirect. Keeping the message
 * in the URL is what lets every console form be a plain server-action form with
 * no client state.
 */
export function AdminFlash({
  params,
}: {
  params: { [key: string]: string | string[] | undefined };
}) {
  const message = typeof params.msg === "string" ? params.msg : null;
  if (!message) return null;

  const tone = params.tone === "err" ? "err" : "ok";

  return (
    <p className={`us-flash us-flash-${tone}`} role={tone === "err" ? "alert" : "status"}>
      {message}
    </p>
  );
}

/**
 * A row's edit form, collapsed by default. <details> rather than a modal: it
 * needs no JavaScript, keeps the table scannable, and lets an operator open
 * two rows side by side to compare them.
 */
export function RowEditor({
  label = "Edit",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="us-rowedit">
      <summary>{label}</summary>
      <div className="us-rowedit-body">{children}</div>
    </details>
  );
}

export function Swatch({ color }: { color: string }) {
  return <span className="us-swatch" style={{ background: color }} aria-hidden />;
}
