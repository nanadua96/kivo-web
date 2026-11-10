import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | Kivo",
  description: "How Kivo may process account and conversation information.",
};

export default function PrivacyPage() {
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
        <h1>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: November 10, 2026</p>
        <p>
          This draft explains the kinds of information that may be involved when
          you use Kivo and the choices available in the interface.
        </p>
        <p className={styles.notice}>
          This page is a draft, not a complete legal privacy notice. The Kivo
          operator must verify actual storage, retention, analytics,
          subprocessors, user rights, and contact details before publishing a
          final policy.
        </p>

        <h2>Information involved</h2>
        <ul>
          <li>
            Account information, such as the email address used to sign in.
          </li>
          <li>Conversations and other content you choose to send to Kivo.</li>
          <li>
            Basic technical and usage information needed to operate, secure, and
            troubleshoot the service.
          </li>
        </ul>

        <h2>How information is used</h2>
        <p>
          Information may be processed to authenticate you, provide responses
          and conversation features, maintain service reliability, prevent
          abuse, and respond to support requests.
        </p>

        <h2>Conversations and account controls</h2>
        <p>
          You can manage conversations using the controls in the sidebar,
          including renaming, pinning, and deleting them. The operator should
          document how deletion affects backups and operational records before
          this draft is treated as a final policy.
        </p>

        <h2>Sharing and service providers</h2>
        <p>
          The service may rely on infrastructure and AI providers to operate.
          The operator should identify those providers, describe what data they
          receive, and explain applicable safeguards in the final policy.
        </p>

        <h2>Security and retention</h2>
        <p>
          Information should be retained only as long as needed for stated
          service purposes and protected with appropriate safeguards. Kivo’s
          actual retention periods and security practices must be confirmed by
          its operator and added here.
        </p>

        <h2>Your choices</h2>
        <p>
          Avoid entering passwords, payment details, health information, or
          other sensitive data into conversations unless you have reviewed the
          final policy and are comfortable with the service’s data practices.
          Applicable privacy rights depend on your location and the service
          operator.
        </p>

        <h2>Contact</h2>
        <p>
          The Kivo operator’s privacy contact and a way to submit privacy
          requests must be added before this draft is published as the final
          policy.
        </p>
      </article>

      <footer className={styles.footer}>
        <Link href="/terms">Terms of Service</Link>
        <Link href="/faq">Help &amp; FAQ</Link>
      </footer>
    </main>
  );
}
