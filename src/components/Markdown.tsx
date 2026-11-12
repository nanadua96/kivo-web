"use client";

import "highlight.js/styles/github-dark.css";
import {
  isValidElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import styles from "./Markdown.module.css";

type MarkdownProps = {
  children: string;
};

function CodeBlock({ children }: { children: ReactNode }) {
  const codeRef = useRef<HTMLPreElement>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [copyStatus, setCopyStatus] = useState("Copy");

  const codeClassName = isValidElement<{ className?: string }>(children)
    ? children.props.className
    : undefined;
  const language = codeClassName?.match(/language-([\w+#.-]+)/)?.[1];

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  async function copyCode() {
    const code = codeRef.current?.textContent;

    if (code === undefined || code === null) {
      setCopyStatus("Copy failed");
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus("Copied");
    } catch (error) {
      console.error("Failed to copy code block:", error);
      setCopyStatus("Copy failed");
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => setCopyStatus("Copy"), 1800);
  }

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeToolbar}>
        <span className={styles.codeLanguage}>{language ?? "Code"}</span>
        <button
          type="button"
          className={styles.copyButton}
          onClick={copyCode}
          aria-label={copyStatus === "Copied" ? "Code copied" : "Copy code"}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={styles.copyIcon}
          >
            <rect x="8" y="8" width="12" height="12" rx="2" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
          </svg>
          <span>{copyStatus}</span>
        </button>
      </div>
      <pre ref={codeRef} className={styles.codeContent}>
        {children}
      </pre>
    </div>
  );
}

const markdownComponents: Components = {
  a({ children, href, title }) {
    const external = /^https?:\/\//i.test(href ?? "");

    return (
      <a
        href={href}
        title={title}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  },

  blockquote({ children }) {
    return <blockquote className={styles.blockquote}>{children}</blockquote>;
  },

  li({ children }) {
    return <li className={styles.listItem}>{children}</li>;
  },

  ol({ children, start }) {
    return (
      <ol className={styles.orderedList} start={start}>
        {children}
      </ol>
    );
  },

  pre({ children }) {
    return <CodeBlock>{children}</CodeBlock>;
  },

  table({ children }) {
    return (
      <section className={styles.tableScroll} aria-label="Scrollable table">
        <table>{children}</table>
      </section>
    );
  },

  ul({ children }) {
    return <ul className={styles.unorderedList}>{children}</ul>;
  },
};

export default function Markdown({ children }: MarkdownProps) {
  return (
    <article className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {children}
      </ReactMarkdown>
    </article>
  );
}

export function ThinkingIndicator() {
  return (
    <output className={styles.thinking} aria-live="polite">
      <span className={styles.thinkingText}>Thinking...</span>
    </output>
  );
}
