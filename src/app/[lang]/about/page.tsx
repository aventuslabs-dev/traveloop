import Image from "next/image";
import Link from "@/i18n/Link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icon } from "@/app/components/Icons";
import { localePage, type LangParams } from "@/i18n/page";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default async function AboutPage({ params }: LangParams) {
  const { dict } = await localePage(params);
  const t = dict.about;

  const values = [
    { icon: "landmark", ...t.values.items.authenticity },
    { icon: "handshake", ...t.values.items.trust },
    { icon: "ticket", ...t.values.items.simplicity },
    { icon: "camera", ...t.values.items.memories },
  ];

  // Placeholder people: the roles are real, the names and bios are not yet.
  const team = [
    t.team.roles.ceo,
    t.team.roles.coo,
    t.team.roles.partnerships,
    t.team.roles.experience,
    t.team.roles.developer,
  ].map((role) => ({ role, name: t.team.placeholderName, bio: t.team.placeholderBio }));

  return (
    <>
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

        <section className="section-light team-section">
          <div className="section-heading centered">
            <h2>{t.team.heading}</h2>
            <p>{t.team.subheading}</p>
            <p className="eyebrow team-founded">{t.team.founded}</p>
          </div>
          <div className="team-grid">
            {team.map((m) => (
              <article className="team-card" key={m.role}>
                <span className="team-avatar">{initials(m.name)}</span>
                <h3>{m.name}</h3>
                <p className="team-role">{m.role}</p>
                <p className="team-bio">{m.bio}</p>
              </article>
            ))}
          </div>
        </section>

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
