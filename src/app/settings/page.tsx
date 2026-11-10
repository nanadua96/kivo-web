"use client";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          Kivo
        </Link>
        <Link href="/" className={styles.backLink}>
          Back to Kivo
        </Link>
      </header>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Your account</p>
        <h1>Settings</h1>
        <p className={styles.intro}>
          Manage your account and find information about using Kivo.
        </p>
        <div className={styles.account}>
          <span className={styles.avatar} aria-hidden="true">
            {(
              session?.user.name?.trim().charAt(0) ||
              session?.user.email?.charAt(0) ||
              "G"
            ).toUpperCase()}
          </span>
          <div>
            <h2>Signed-in account</h2>
            <p>
              {isPending
                ? "Loading account..."
                : (session?.user.email ?? "Guest")}
            </p>
          </div>
        </div>
        <p className={styles.note}>
          Account preferences are not available here yet. You can sign out from
          the profile menu in the chat sidebar.
        </p>
        <nav className={styles.links} aria-label="Kivo information">
          <Link href="/faq">Help &amp; FAQ</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
        </nav>
      </section>
    </main>
  );
}
