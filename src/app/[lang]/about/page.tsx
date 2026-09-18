import Image from "next/image";
import Link from "@/i18n/Link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icon } from "@/app/components/Icons";
import { localePage, type LangParams } from "@/i18n/page";
import JsonLd from "@/app/components/JsonLd";
import { breadcrumbJsonLd, jsonLdGraph } from "@/lib/seo";

export default async function AboutPage({ params }: LangParams) {
  const { lang, dict } = await localePage(params);
  const t = dict.about;

  const values = [
    { icon: "landmark", ...t.values.items.authenticity },
    { icon: "handshake", ...t.values.items.trust },
    { icon: "ticket", ...t.values.items.simplicity },
    { icon: "camera", ...t.values.items.memories },
  ];

  return (
    <>
      <JsonLd
        json={jsonLdGraph(
          breadcrumbJsonLd(lang, dict.common.nav.home, [
            { name: dict.common.nav.about, path: "/about" },
          ])
        )}
      />
      <Navbar dict={dict.common.nav} language={dict.common.language} forceScrolled />
      <main id="main">
        <section className="arrival section-light page-hero about-hero">
          <div className="section-heading centered">
            <p className="eyebrow">{t.hero.eyebrow}</p>
            <h2>
              {t.hero.headingLead}
              <br />
              <em>{t.hero.headingEm}</em>
            </h2>
            <p>{t.hero.body}</p>
          </div>
        </section>

        <section className="section-light">
          <div className="about-story about-story-solo">
            <div className="about-story-copy">
              <p className="eyebrow">{t.story.eyebrow}</p>
              <h2>
                {t.story.headingLead}
                <br />
                <em>{t.story.headingEm}</em>
              </h2>
              <p>{t.story.body1}</p>
              <p>{t.story.body2}</p>
            </div>
          </div>
        </section>

        <section className="section-cream about-values">
          <div className="section-heading centered">
            <p className="eyebrow">{t.values.eyebrow}</p>
            <h2>
              {t.values.headingLead}
              <br />
              <em>{t.values.headingEm}</em>
            </h2>
          </div>
          <div className="value-grid">
            {values.map((v) => (
              <article className="value-card" key={v.title}>
                <span className="value-card-icon">
                  <Icon name={v.icon} />
                </span>
                <h3>{v.title}</h3>
                <p>{v.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/*
          "Meet the team" is out until there are real people to put in it. It
          rendered five cards all reading "Name" with a bio that said a bio was
          coming — on the page whose whole job is to make the company look like
          someone you'd hand your passport details to. The copy for it is still
          in the dictionaries under `about.team`, and the section styles are
          still in globals.css, so restoring it is this block coming back.
        */}

        <section className="closing section-dark">
          <div className="closing-bg">
            <Image
              src="https://images.unsplash.com/photo-1664797092984-c817193dfa0f?auto=format&fit=crop&w=2200&q=88"
              alt=""
              fill
              sizes="100vw"
            />
          </div>
          <div className="closing-overlay" />
          <div className="closing-content">
            <h2>{t.closing.heading}</h2>
            <p className="closing-copy">{t.closing.body}</p>
            <Link className="button primary" href="/#what">
              {t.closing.cta}
            </Link>
          </div>
        </section>
      </main>
      <Footer dict={dict.common.footer} />
    </>
  );
}
