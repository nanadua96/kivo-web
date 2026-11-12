"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import styles from "./faq.module.css";

type Question = {
  question: string;
  answer: ReactNode;
};

const categories = [
  "Getting started",
  "Conversations",
  "Using Kivo",
  "Privacy & safety",
] as const;

type Category = (typeof categories)[number];

const questions: Record<Category, Question[]> = {
  "Getting started": [
    {
      question: "How do I sign in to Kivo?",
      answer: (
        <p>
          Enter your email address in the sign-in dialog and use the
          verification code sent to your inbox to complete sign-in.
        </p>
      ),
    },
    {
      question: "I did not receive a verification code. What can I do?",
      answer: (
        <p>
          Check that the email address is correct, look in your spam or
          promotions folders, and request a new code. If it still does not
          arrive, try again later.
        </p>
      ),
    },
    {
      question: "Do I need an account to use Kivo?",
      answer: (
        <p>
          Some features may be available before you sign in. Signing in lets
          Kivo associate conversations with your account so they can appear in
          your conversation list.
        </p>
      ),
    },
  ],
  Conversations: [
    {
      question: "How do I rename a conversation?",
      answer: (
        <p>
          Open the conversation’s three-dot menu, choose Rename, enter a name up
          to 80 characters, and save it.
        </p>
      ),
    },
    {
      question: "How do I pin or unpin a conversation?",
      answer: (
        <p>
          Use the conversation’s menu to pin or unpin it. Pinned conversations
          are marked with a P in the list.
        </p>
      ),
    },
    {
      question: "Can I delete a conversation?",
      answer: (
        <p>
          Yes. Choose Delete in the conversation menu and confirm when prompted.
          Review the <Link href="/privacy">Privacy Policy</Link> for the current
          draft description of conversation data.
        </p>
      ),
    },
    {
      question: "Why can’t I find a conversation?",
      answer: (
        <p>
          Check that you are signed in to the account you used previously, then
          refresh the page. If it remains missing, contact the Kivo support team
          once contact details are available.
        </p>
      ),
    },
  ],
  "Using Kivo": [
    {
      question: "Why might an answer be incorrect?",
      answer: (
        <p>
          AI-generated answers can misunderstand a prompt or provide incomplete
          or inaccurate information. Verify important details with a trusted
          source before relying on them.
        </p>
      ),
    },
    {
      question: "How can I get a more useful response?",
      answer: (
        <p>
          State your goal, include relevant context, and mention the format or
          level of detail you want. You can ask follow-up questions to refine
          the result.
        </p>
      ),
    },
  ],
  "Privacy & safety": [
    {
      question: "What information should I avoid sharing?",
      answer: (
        <p>
          Avoid including passwords, payment credentials, or other sensitive
          personal information. Read the{" "}
          <Link href="/privacy">Privacy Policy</Link>
          draft before sharing information.
        </p>
      ),
    },
    {
      question: "Where can I read Kivo’s policies?",
      answer: (
        <p>
          See the <Link href="/terms">Terms of Service</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>. These pages are drafts
          and should be reviewed by the service operator before being treated as
          final legal notices.
        </p>
      ),
    },
  ],
};

type Props = {
  supportEmail?: string;
};

export function FaqClient({ supportEmail }: Props) {
  const [activeCategory, setActiveCategory] =
    useState<Category>("Getting started");

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

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <p className={styles.sidebarHeading}>Help center</p>
          <nav aria-label="Help topics" className={styles.categories}>
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                className={`${styles.categoryButton} ${activeCategory === category ? styles.activeCategory : ""}`}
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </nav>
          <div className={styles.sidebarLinks}>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </aside>

        <section className={styles.content} aria-labelledby="faq-title">
          <p className={styles.eyebrow}>Kivo support</p>
          <h1 id="faq-title">{activeCategory}</h1>
          <p className={styles.intro}>
            Find quick answers about your account, conversations, and using
            Kivo.
          </p>
          <div className={styles.questions}>
            {questions[activeCategory].map(({ question, answer }) => (
              <details className={styles.question} key={question}>
                <summary>
                  <span>{question}</span>
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="m5 7.5 5 5 5-5" />
                  </svg>
                </summary>
                <div className={styles.answer}>{answer}</div>
              </details>
            ))}
          </div>

          <section className={styles.feedback} id="feedback">
            <div>
              <h2>Still need help?</h2>
              <p>Send the Kivo team a question or share feedback.</p>
            </div>
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`}>Send feedback</a>
            ) : (
              <p className={styles.contactNote}>
                Feedback contact details are not configured yet.
              </p>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
