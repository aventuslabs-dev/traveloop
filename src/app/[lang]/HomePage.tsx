"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "@/i18n/Link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icon } from "@/app/components/Icons";
import type { LocalizedPartner } from "@/app/data/partners";
import type { PassTier } from "@/app/data/passes";
import { PassStack } from "@/app/components/PassCard";
import {
  useVideoPlayer,
  VideoStage,
  VideoControls,
  VideoCloseButton,
  youtube,
  selfHosted,
  type VideoPlayer,
  type VideoSource,
} from "@/app/components/VideoPlayer";
import { fill } from "@/i18n/interpolate";
import type enCommon from "@/i18n/dictionaries/en/common";
import type enHome from "@/i18n/dictionaries/en/home";

/** Mirrors the visible FAQ below so assistants and search engines read the same answers. */
const faqJsonLd = (items: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
});


export default function Home({
  dict,
  nav,
  language,
  footer,
  tiers,
  partners,
}: {
  dict: typeof enHome;
  nav: typeof enCommon.nav;
  language: typeof enCommon.language;
  footer: typeof enCommon.footer;
  tiers: PassTier[];
  partners: LocalizedPartner[];
}) {
  /** Cheapest tier, so the "starting from" price and its strikethrough always belong together. */
  const cheapestTier = [...tiers].sort((a, b) => a.priceCents - b.priceCents)[0];

  const faqItems = Object.entries(dict.faq.items).map(([key, item]) => ({ key, ...item }));

  const whyHighlights = [
    { img: "/privileges.png", icon: "coins", ...dict.why.highlights.privileges },
    { img: "/local.png", icon: "handshake", ...dict.why.highlights.local },
    { img: "/tokio.png", icon: "shield", ...dict.why.highlights.insurance },
  ];

  const reviews = [
    {
      ...dict.reviews.items.wei,
      mask: "*******",
      date: "2026-06-21 14:32:08",
      img: "/lion-dance.webp",
    },
    {
      ...dict.reviews.items.aisyah,
      mask: "****",
      date: "2026-06-09 09:47:52",
      img: "/batik.jpg",
    },
    {
      ...dict.reviews.items.rajan,
      mask: "**********",
      date: "2026-05-27 17:03:41",
      img: "/food-malaysia.png",
    },
  ];

  const tasteVideoId = "Jg0PRB5Aebo";
  // TODO: swap these placeholder video IDs for the real Batik / Indian Heritage footage.
  const lion = useVideoPlayer();
  const batik = useVideoPlayer();
  const indian = useVideoPlayer();
  const taste = useVideoPlayer();
  const film = useVideoPlayer();
  const lionCopyRef = useRef<HTMLDivElement>(null);
  const batikCopyRef = useRef<HTMLDivElement>(null);
  const indianCopyRef = useRef<HTMLDivElement>(null);
  const tasteCopyRef = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<string | null>("refundable");
  const loaderRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const filmModalRef = useRef<HTMLDialogElement>(null);
  const filmVideoId = "8V7czbc0kxg";
  // Sources are fixed; the titles shown in the player follow the locale.
  const destinationVideos = {
    kualaLumpur: {
      source: youtube("cvT7CyFJ76I"),
      name: dict.discover.places.kualaLumpur.name,
    },
    langkawi: { source: youtube("l1YiY-OaS9I"), name: dict.discover.places.langkawi.name },
    // Penang plays our own footage from public/ rather than YouTube.
    penang: { source: selfHosted("/penang.mp4"), name: dict.discover.places.penang.name },
  };

  function playFilm(source: VideoSource, title: string) {
    const modal = filmModalRef.current;
    modal?.showModal();
    film.start(source, title);
    // On mobile, drop into real browser fullscreen (hides the address bar
    // like a native player) and try to lock landscape. Both are best-effort:
    // iOS Safari has no orientation.lock, so it silently no-ops there and the
    // viewer just rotates their phone.
    if (modal && window.matchMedia("(max-width: 640px)").matches) {
      modal
        .requestFullscreen?.()
        .then(() => {
          const orientation = screen.orientation as ScreenOrientation & {
            lock?: (o: string) => Promise<void>;
          };
          orientation?.lock?.("landscape").catch(() => {});
        })
        .catch(() => {});
    }
  }

  // On mobile the ambient in-section player is cramped, so tapping Play Video
  // opens the same fullscreen dialog used for "Watch the story" instead.
  function playAmbientOrFullscreen(player: VideoPlayer, source: VideoSource, title: string) {
    if (window.matchMedia("(max-width: 640px)").matches) {
      playFilm(source, title);
    } else {
      player.start(source, title);
    }
  }

  useEffect(() => {
    lionCopyRef.current?.classList.toggle("is-hidden", lion.playing);
  }, [lion.playing]);

  useEffect(() => {
    batikCopyRef.current?.classList.toggle("is-hidden", batik.playing);
  }, [batik.playing]);

  useEffect(() => {
    indianCopyRef.current?.classList.toggle("is-hidden", indian.playing);
  }, [indian.playing]);

  useEffect(() => {
    tasteCopyRef.current?.classList.toggle("is-hidden", taste.playing);
  }, [taste.playing]);

  useEffect(() => {
    const onLoad = () =>
      setTimeout(() => loaderRef.current?.classList.add("hidden"), 450);
    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad);
    }

    function onScroll() {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) {
        progressRef.current.style.width = `${Math.min(100, (y / max) * 100)}%`;
      }
      if (heroBgRef.current && y < window.innerHeight * 1.2) {
        heroBgRef.current.style.transform = `translate3d(0, ${y * 0.12}px, 0) scale(1.04)`;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.14 }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

    const filmModal = filmModalRef.current;
    const onFilmBackdropClick = (e: MouseEvent) => {
      if (e.target === filmModal) filmModal?.close();
    };
    const onFilmClose = () => {
      film.stop();
      if (document.fullscreenElement === filmModal) document.exitFullscreen().catch(() => {});
      const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
      orientation?.unlock?.();
    };
    // A swipe-down / system back gesture exits fullscreen without firing the
    // dialog's own close event, so the modal would otherwise stay open behind it.
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && filmModal?.open) filmModal.close();
    };
    filmModal?.addEventListener("click", onFilmBackdropClick);
    filmModal?.addEventListener("close", onFilmClose);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      window.removeEventListener("load", onLoad);
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
      filmModal?.removeEventListener("click", onFilmBackdropClick);
      filmModal?.removeEventListener("close", onFilmClose);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
    // film.stop only closes over stable refs/setters from useVideoPlayer, so it's
    // safe to omit `film` here — including it would re-run this mount-only effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqItems)) }}
      />

      <div className="progress" aria-hidden="true">
        <span ref={progressRef}></span>
      </div>

      {/* The loader is dismissed by JS on window.load. Without this, a visitor
          whose bundle fails — or who has JS off — sits behind a full-screen
          overlay forever. The CSS failsafe below lifts it either way. */}
      <noscript>
        <style>{`
          #loader { display: none !important; }
          /* .reveal is faded in by an IntersectionObserver; without JS that
             never runs, so the whole page would render blank. */
          .reveal { opacity: 1 !important; transform: none !important; }
        `}</style>
      </noscript>
      <div className="loader" id="loader" ref={loaderRef}>
        <div className="loader-plane">✈</div>
        <p>{dict.loader}</p>
      </div>

      <Navbar dict={nav} language={language} />

      <main id="main">
        <section className="hero section-dark" data-nav="dark">
          <div className="hero-bg" ref={heroBgRef} aria-hidden="true">
            <Image src="/hero3.png" alt="" fill priority sizes="100vw" className="hero-bg-img" />
          </div>
          <div className="hero-overlay" aria-hidden="true"></div>
          <div className="hero-cloud cloud-a" aria-hidden="true"></div>
          <div className="hero-cloud cloud-b" aria-hidden="true"></div>
          <div className="flight-path" aria-hidden="true">
            <span className="plane">✈</span>
          </div>

          <div className="hero-content reveal">
            <p className="eyebrow light">{dict.hero.eyebrow}</p>
            <h1>
              {dict.hero.headingLead}
              <br />
              <em>{dict.hero.headingEm}</em>
            </h1>
            <p className="hero-copy">{dict.hero.copy}</p>
            <div className="hero-actions">
              <a className="button primary" href="#discover">
                {dict.hero.begin}
              </a>
              <button
                className="button ghost"
                onClick={() => playFilm(youtube(filmVideoId), dict.hero.filmTitle)}
              >
                {dict.hero.watchStory} <span>▶</span>
              </button>
            </div>
          </div>

          <a href="#discover" className="scroll-cue" aria-label={dict.hero.scrollAria}>
            <span>{dict.hero.scrollCue}</span>
            <i></i>
          </a>
        </section>

        <section className="arrival section-light" id="discover" data-nav="light">
          <div className="section-heading centered reveal">
            <h2>{dict.discover.heading}</h2>
            <p>{dict.discover.body}</p>
            <p className="discover-hint">
              <span>▶</span> {dict.discover.hint}
            </p>
          </div>

          <div className="discover-grid">
            <button
              type="button"
              className="discover-tile tile-heritage reveal"
              onClick={() =>
                playFilm(
                  destinationVideos.penang.source,
                  `${destinationVideos.penang.name} — Traveloop`
                )
              }
              aria-label={fill(dict.discover.watchAria, {
                place: dict.discover.places.penang.name,
              })}
            >
              <span className="discover-play">▶</span>
              <span className="discover-tag">{dict.discover.places.penang.tag}</span>
              <span className="discover-place">{dict.discover.places.penang.name}</span>
            </button>
            <button
              type="button"
              className="discover-tile tile-island is-soon reveal delay-1"
              disabled
              aria-label={fill(dict.discover.soonAria, {
                place: dict.discover.places.langkawi.name,
              })}
            >
              <span className="discover-tag">{dict.discover.places.langkawi.tag}</span>
              <span className="discover-place">{dict.discover.places.langkawi.name}</span>
              <span className="discover-soon-badge">{dict.discover.comingSoon}</span>
            </button>
            <button
              type="button"
              className="discover-tile tile-city is-soon reveal delay-2"
              disabled
              aria-label={fill(dict.discover.soonAria, {
                place: dict.discover.places.kualaLumpur.name,
              })}
            >
              <span className="discover-tag">{dict.discover.places.kualaLumpur.tag}</span>
              <span className="discover-place">{dict.discover.places.kualaLumpur.name}</span>
              <span className="discover-soon-badge">{dict.discover.comingSoon}</span>
            </button>
          </div>

        </section>

        <section className="experience-intro section-blue" id="experiences" data-nav="dark">
          <div className="section-heading split reveal">
            <div>
              <p className="eyebrow">{dict.experiences.eyebrow}</p>
              <h2>
                {dict.experiences.headingLead}
                <br />
                <em>{dict.experiences.headingEm}</em>
              </h2>
            </div>
            <p>{dict.experiences.body}</p>
          </div>
        </section>

        <section className="experience-panel lion section-dark" data-nav="dark">
          <div className="experience-bg" aria-hidden="true"></div>
          {lion.playing && (
            <div className="experience-video" aria-hidden="true">
              <VideoStage player={lion} />
            </div>
          )}
          <div className="experience-shade" aria-hidden="true"></div>
          <div className="experience-copy reveal" ref={lionCopyRef}>
            <p className="experience-number">{dict.experiences.lion.number}</p>
            <h2>
              {dict.experiences.lion.headingLead}
              <br />
              {dict.experiences.lion.headingMid}
              <em>{dict.experiences.lion.headingEm}</em>
            </h2>
            <p>{dict.experiences.lion.body}</p>
            <button
              type="button"
              className="play-video-btn"
              onClick={() =>
                playAmbientOrFullscreen(lion, youtube("qLRp1pvOLr4"), dict.experiences.lion.videoTitle)
              }
              aria-label={dict.experiences.lion.playAria}
            >
              <span className="play-video-icon">▶</span>
              {dict.experiences.playVideo}
            </button>
          </div>
          {lion.playing && <VideoControls player={lion} />}
          {lion.playing && <VideoCloseButton player={lion} />}
        </section>

        <section className="experience-panel batik section-dark" data-nav="dark">
          <div className="experience-bg" aria-hidden="true"></div>
          {batik.playing && (
            <div className="experience-video" aria-hidden="true">
              <VideoStage player={batik} />
            </div>
          )}
          <div className="experience-shade" aria-hidden="true"></div>
          <div className="experience-copy reveal" ref={batikCopyRef}>
            <p className="experience-number">{dict.experiences.batik.number}</p>
            <h2>
              {dict.experiences.batik.headingLead}
              <br />
              <em>{dict.experiences.batik.headingEm}</em>
            </h2>
            <p>{dict.experiences.batik.body}</p>
            <button
              type="button"
              className="play-video-btn"
              onClick={() =>
                playAmbientOrFullscreen(batik, youtube("qLRp1pvOLr4"), dict.experiences.batik.videoTitle)
              }
              aria-label={dict.experiences.batik.playAria}
            >
              <span className="play-video-icon">▶</span>
              {dict.experiences.playVideo}
            </button>
          </div>
          {batik.playing && <VideoControls player={batik} />}
          {batik.playing && <VideoCloseButton player={batik} />}
          <div className="batik-orbit" aria-hidden="true"></div>
        </section>

        <section className="experience-panel indian section-dark" data-nav="dark">
          <div className="experience-bg" aria-hidden="true"></div>
          {indian.playing && (
            <div className="experience-video" aria-hidden="true">
              <VideoStage player={indian} />
            </div>
          )}
          <div className="experience-shade" aria-hidden="true"></div>
          <div className="experience-copy reveal" ref={indianCopyRef}>
            <p className="experience-number">{dict.experiences.indian.number}</p>
            <h2>
              {dict.experiences.indian.headingLead}
              <br />
              <em>{dict.experiences.indian.headingEm}</em>
            </h2>
            <p>{dict.experiences.indian.body}</p>
            <button
              type="button"
              className="play-video-btn"
              onClick={() =>
                playAmbientOrFullscreen(indian, youtube("qLRp1pvOLr4"), dict.experiences.indian.videoTitle)
              }
              aria-label={dict.experiences.indian.playAria}
            >
              <span className="play-video-icon">▶</span>
              {dict.experiences.playVideo}
            </button>
          </div>
          {indian.playing && <VideoControls player={indian} />}
          {indian.playing && <VideoCloseButton player={indian} />}
        </section>

        <section className={`taste section-light${taste.playing ? " is-playing" : ""}`} id="taste" data-nav="light">
          {taste.playing && (
            <div className="taste-bg-video" aria-hidden="true">
              <VideoStage player={taste} />
              <div className="taste-video-mask top" />
              <div className="taste-video-mask bottom" />
            </div>
          )}
          <div className="section-heading centered reveal" ref={tasteCopyRef}>
            <p className="eyebrow">{dict.taste.eyebrow}</p>
            <h2>
              {dict.taste.headingLead}
              <br />
              <em>{dict.taste.headingEm}</em>
            </h2>
            <p>{dict.taste.body}</p>
            <button
              type="button"
              className="play-video-btn on-light"
              onClick={() =>
                playAmbientOrFullscreen(taste, youtube(tasteVideoId), dict.taste.videoTitle)
              }
              aria-label={dict.taste.playAria}
            >
              <span className="play-video-icon">▶</span>
              {dict.experiences.playVideo}
            </button>
          </div>
          {taste.playing && <VideoControls player={taste} />}
          {taste.playing && <VideoCloseButton player={taste} />}
        </section>

        <section className="why section-light" id="why" data-nav="light">
          <div className="why-hero reveal">
            <div className="why-hero-copy">
              <p className="eyebrow">{dict.why.eyebrow}</p>
              <h2>
                {dict.why.headingLead}
                <br />
                <em>{dict.why.headingEm}</em>
              </h2>
              <p>
                {dict.why.body1}
                <span className="gradient-highlight">{dict.why.body2}</span>
                {dict.why.body3}
              </p>
              <Link className="button primary taste-cta" href="/partners">
                {dict.why.cta}
              </Link>
            </div>
          </div>

          <div className="why-cards reveal">
            {whyHighlights.map((h, i) => (
              <article className={`why-card delay-${i + 1}`} key={h.title}>
                <div className="why-card-bg">
                  <Image src={h.img} alt="" fill sizes="(max-width: 862px) 100vw, 33vw" />
                </div>
                <div className="why-card-overlay" />
                <div className="why-card-content">
                  <span className="why-card-icon">
                    <Icon name={h.icon} />
                  </span>
                  <span className="why-card-headline">{h.headline}</span>
                  <div className="why-card-stat-group">
                    <strong className="why-card-stat">{h.tag}</strong>
                    <span className="why-card-title">{h.title}</span>
                  </div>
                  <p>{h.body}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="reviews reveal">
            <h3 className="reviews-label">{dict.reviews.label}</h3>
            <div className="reviews-grid">
              {reviews.map((r) => (
                <article className="review-card" key={r.name}>
                  <div className="review-head">
                    <div>
                      <strong className="review-name">
                        {r.name} <span className="review-mask">{r.mask}</span>
                      </strong>
                      <span className="review-date">{r.date}</span>
                    </div>
                    <span className="review-rating">
                      {dict.reviews.rating} <span className="review-rating-badge">5.0</span>
                    </span>
                  </div>
                  <p className="review-body">{r.body}</p>
                  <a className="review-activity" href="#experiences">
                    <Image
                      className="review-activity-img"
                      src={r.img}
                      alt=""
                      width={44}
                      height={44}
                    />
                    {r.activity}
                  </a>
                </article>
              ))}
            </div>
          </div>

          <div className="partners reveal">
            <h3 className="partners-label">{dict.partners.label}</h3>
            <div className="partners-marquee">
              <div className="partners-track">
                {[...partners, ...partners].map((p, i) => (
                  <div className="partner-card-mini" key={`${p.name}-${i}`}>
                    <span className="partner-card-mini-logo">
                      <Image
                        src={p.logo}
                        alt={p.name}
                        width={128}
                        height={88}
                        sizes="128px"
                      />
                    </span>
                    <span className="partner-card-mini-name">{p.name}</span>
                    <span className="partner-card-mini-deal">{p.deal}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="what section-cream" id="what" data-nav="light">
          <div className="section-heading centered reveal">
            <p className="eyebrow">{dict.what.eyebrow}</p>
            <h2>{dict.what.heading}</h2>
            <p>
              {dict.what.body1}
              <span className="gradient-highlight">{dict.what.body2}</span>
              {dict.what.body3}
            </p>
          </div>

          <div className="what-passes reveal">
            <PassStack className="pass-stack-light" />
          </div>

          <div className="what-cta reveal">
            <p className="what-cta-label">{dict.what.startingFrom}</p>
            <div className="what-cta-price">
              <s>
                <small>MYR</small>
                {cheapestTier.originalPrice}
              </s>
              <strong>
                <small>MYR</small>
                {cheapestTier.price}
              </strong>
            </div>
            <span className="tier-discount-badge">{dict.what.launchDiscount}</span>
            <Link className="button primary tier-purchase-cta" href="/passes">
              {dict.what.cta}
            </Link>
          </div>
        </section>

        <section className="faq-section section-red" id="faq" data-nav="dark">
          <div className="faq-facets" aria-hidden="true">
            <span className="facet facet-a"></span>
            <span className="facet facet-b"></span>
            <span className="facet facet-c"></span>
          </div>
          <div className="faq-header reveal">
            <h2>
              {dict.faq.headingLead}
              <span className="accent">{dict.faq.headingAccent}</span>
            </h2>
            <p>{dict.faq.body}</p>
          </div>

          <div className="accordion faq-accordion reveal">
            {faqItems.map((item) => {
              const isOpen = openFaq === item.key;
              return (
                <div
                  className={`accordion-row${isOpen ? " open" : ""}`}
                  key={item.key}
                >
                  <button
                    type="button"
                    className="accordion-head"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : item.key)}
                  >
                    <span className="accordion-title">{item.question}</span>
                    <span className="accordion-chevron" aria-hidden="true">
                      <svg viewBox="0 0 16 16" width="14" height="14">
                        <path
                          d="M3.5 6l4.5 4.5L12.5 6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                  {isOpen && <p className="accordion-body">{item.answer}</p>}
                </div>
              );
            })}
          </div>

          <p className="faq-quiz-link">
            {dict.faq.stillHaveQuestions}{" "}
            <Link className="text-link-button" href="/contact">
              {dict.faq.contactUs}
            </Link>
          </p>
        </section>

        <section className="closing section-dark" data-nav="dark">
          <div className="closing-bg" aria-hidden="true">
            <Image
              src="https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=2200&q=88"
              alt=""
              fill
              sizes="100vw"
            />
          </div>
          <div className="closing-overlay" aria-hidden="true"></div>
          <div className="closing-content reveal">
            <h2>{dict.closing.heading}</h2>
            <p className="closing-copy">{dict.closing.body}</p>
            <a className="button primary" href="#what">
              {dict.closing.cta}
            </a>
          </div>
        </section>
      </main>

      <Footer dict={footer} />

      <dialog className="modal" ref={filmModalRef} aria-label={dict.video.playerLabel}>
        <button
          type="button"
          className="modal-close"
          aria-label={dict.video.close}
          onClick={() => filmModalRef.current?.close()}
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="film-video">
          <VideoStage player={film} />
        </div>
        {film.playing && <VideoControls player={film} />}
      </dialog>
    </>
  );
}
