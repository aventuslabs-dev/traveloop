import Image from "next/image";
import Link from "@/i18n/Link";
import { Icon } from "./Icons";
import type enCommon from "@/i18n/dictionaries/en/common";

type FooterDict = typeof enCommon.footer;

/** Renders a dictionary string that carries deliberate line breaks. */
function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {line}
        </span>
      ))}
    </>
  );
}

export default function Footer({ dict }: { dict: FooterDict }) {
  return (
    <footer>
      <div className="footer-top">
        <div className="footer-brand">
          <Image src="/traveloop-logo.webp" alt="Traveloop" width={1280} height={345} />
          <p>{dict.tagline}</p>
          <div className="footer-links">
            <span
              className="footer-link-placeholder"
              title={dict.instagramSoon}
              aria-label="Instagram"
            >
              <Icon name="instagram" />
            </span>
            <span
              className="footer-link-placeholder"
              title={dict.tiktokSoon}
              aria-label="TikTok"
            >
              <Icon name="tiktok" />
            </span>
          </div>
        </div>

        <div className="footer-col">
          <h4>{dict.getInTouch}</h4>
          <address className="footer-contact">
            <span className="footer-contact-row">
              <span className="footer-contact-icon">
                <Icon name="pin" />
              </span>
              <span>
                <Lines text={dict.address} />
              </span>
            </span>
            <a className="footer-contact-row" href="tel:+601139492888">
              <span className="footer-contact-icon">
                <Icon name="phone" />
              </span>
              <span>+6011-3949-2888</span>
            </a>
            <a
              className="footer-contact-row"
              href="mailto:partnership@traveloop.my"
            >
              <span className="footer-contact-icon">
                <Icon name="mail" />
              </span>
              <span>partnership@traveloop.my</span>
            </a>
          </address>
        </div>

        <div className="footer-col">
          <h4>{dict.legal}</h4>
          <div className="footer-legal-links">
            <Link href="/terms">{dict.terms}</Link>
            <Link href="/privacy">{dict.privacy}</Link>
          </div>
          <p className="footer-license">
            <Lines text={dict.license} />
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <small>{dict.copyright}</small>
      </div>
    </footer>
  );
}
