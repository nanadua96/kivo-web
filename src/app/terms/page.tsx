import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Terms of Service | Kivo",
  description: "Terms for using Kivo.",
};

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          Kivo
        </Link>
        <Link className={styles.backLink} href="/">
          Back to Kivo
        </Link>
      </header>

      <article className={styles.content}>
        <h1>Terms of Service</h1>
        <p className={styles.updated}>Last updated: November 10, 2026</p>
        <p>
          These terms describe the basic conditions for accessing and using
          Kivo. By using the service, you agree to follow these terms and
          applicable law.
        </p>
        <p className={styles.notice}>
          This is a draft for the Kivo website, not a finalized legal agreement.
          Before launch, the service operator should confirm the contracting
          entity, jurisdiction, contact details, and service-specific terms.
        </p>

        <h2>Using Kivo</h2>
        <p>
          You may use Kivo for lawful purposes and are responsible for activity
          carried out through your account. Keep your sign-in details secure and
          tell us if you believe someone else has accessed your account.
        </p>

        <h2>Your content</h2>
        <p>
          You retain any rights you have in the text and other material you
          submit. You authorize Kivo to process that content as needed to
          provide the service and its features. Do not submit material you are
          not permitted to share.
        </p>

        <h2>AI-generated responses</h2>
        <p>
          Kivo may generate responses using automated systems. Responses can be
          incomplete, outdated, or incorrect and are not professional advice.
          Review important information independently before acting on it.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Do not use Kivo to break the law, interfere with the service, attempt
          unauthorized access, or infringe another person’s rights. We may
          restrict access when reasonably needed to protect users or the
          service.
        </p>

        <h2>Availability and changes</h2>
        <p>
          Features may change over time, and Kivo may be unavailable from time
          to time for maintenance or other reasons. We may update these terms;
          continued use after an update takes effect means you accept the
          revised terms.
        </p>

        <h2>Contact</h2>
        <p>
          A service contact and the process for legal notices should be
          published here by the Kivo operator before these terms are used as a
          binding agreement.
        </p>
      </article>

      <footer className={styles.footer}>
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/faq">Help &amp; FAQ</Link>
      </footer>
    </main>
  );
}
