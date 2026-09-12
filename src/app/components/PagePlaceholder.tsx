import Navbar from "./Navbar";
import type enCommon from "@/i18n/dictionaries/en/common";

export default function PagePlaceholder({
  eyebrow,
  title,
  body,
  nav,
  language,
}: {
  eyebrow: string;
  title: string;
  body: string;
  nav: typeof enCommon.nav;
  language: typeof enCommon.language;
}) {
  return (
    <>
      <Navbar dict={nav} language={language} forceScrolled />
      <main>
        <section className="arrival section-light" style={{ minHeight: "70svh" }}>
          <div className="section-heading centered">
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            <p>{body}</p>
          </div>
        </section>
      </main>
    </>
  );
}
