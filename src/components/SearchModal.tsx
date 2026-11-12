"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import styles from "./SearchModal.module.css";

type SearchValues = {
  query: string;
};

type SearchResult = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
};

type Props = {
  onClose: () => void;
  onSelect: (id: string) => void;
};

const DEMO_CONVERSATIONS: SearchResult[] = [
  {
    id: "demo-chat-javascript",
    title: "JavaScript fundamentals",
    preview: "A quick overview of variables, functions, and the event loop.",
    updatedAt: "Today",
  },
  {
    id: "demo-chat-travel",
    title: "Weekend trip to Kyoto",
    preview: "Ideas for temples, food, and a two-day itinerary.",
    updatedAt: "Yesterday",
  },
  {
    id: "demo-chat-pasta",
    title: "Easy weeknight pasta",
    preview: "Simple pantry-friendly recipes with tomato and basil.",
    updatedAt: "Monday",
  },
  {
    id: "demo-chat-resume",
    title: "Resume bullet improvements",
    preview: "Make project achievements concise and measurable.",
    updatedAt: "Last week",
  },
  {
    id: "demo-chat-typescript",
    title: "TypeScript generics explained",
    preview: "Examples of reusable functions and constrained type parameters.",
    updatedAt: "Last week",
  },
];

export default function SearchModal({ onClose, onSelect }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { control, register, handleSubmit } = useForm<SearchValues>({
    defaultValues: { query: "" },
  });
  const queryField = register("query");
  const query = (useWatch({ control, name: "query" }) ?? "").trim();

  const searchQuery = useQuery({
    queryKey: ["demo-conversation-search", query],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 120));
      const normalizedQuery = query.toLowerCase();
      return DEMO_CONVERSATIONS.filter((conversation) =>
        `${conversation.title} ${conversation.preview}`
          .toLowerCase()
          .includes(normalizedQuery),
      );
    },
    enabled: query.length > 0,
    staleTime: 30_000,
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className={styles.backdrop}>
      <button
        type="button"
        className={styles.backdropClose}
        onClick={onClose}
        aria-label="Close search"
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="conversation-search-title"
      >
        <header className={styles.header}>
          <div>
            <h2 id="conversation-search-title">Search conversations</h2>
            <p>Find a conversation by title or content.</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close search"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
        </header>

        <search className={styles.searchRegion} aria-label="Search conversations">
          <form
            className={styles.searchForm}
            onSubmit={handleSubmit(() => {
              if (query) void searchQuery.refetch();
            })}
          >
            <label
              className={styles.visuallyHidden}
              htmlFor="conversation-search"
            >
              Search conversations
            </label>
            <svg
              className={styles.searchIcon}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 5 5" />
            </svg>
            <input
              {...queryField}
              ref={(element) => {
                queryField.ref(element);
                inputRef.current = element;
              }}
              id="conversation-search"
              type="search"
              autoComplete="off"
              placeholder="Search conversations..."
            />
            <button type="submit" className={styles.searchButton}>
              Search
            </button>
          </form>
        </search>

        <div className={styles.results} aria-live="polite">
          {!query ? (
            <p className={styles.emptyState}>
              Start typing to search the demo conversation library.
            </p>
          ) : searchQuery.isPending ? (
            <output className={styles.emptyState}>
              Searching...
            </output>
          ) : searchQuery.isError ? (
            <div className={styles.emptyState} role="alert">
              <p>Search failed. Please try again.</p>
              <button
                type="button"
                className={styles.retryButton}
                onClick={() => void searchQuery.refetch()}
              >
                Retry
              </button>
            </div>
          ) : searchQuery.data?.length ? (
            <ul className={styles.resultList}>
              {searchQuery.data.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    className={styles.result}
                    onClick={() => onSelect(result.id)}
                  >
                    <span className={styles.resultIcon} aria-hidden="true">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21.5v-16Z" />
                        <path d="M5 5.5v16M9 7h7M9 10h7" />
                      </svg>
                    </span>
                    <span className={styles.resultText}>
                      <span className={styles.resultTitle}>{result.title}</span>
                      <span className={styles.resultPreview}>
                        {result.preview}
                      </span>
                    </span>
                    <span className={styles.resultDate}>{result.updatedAt}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>
              No conversations found for &quot;{query}&quot;.
            </p>
          )}
        </div>

        <footer className={styles.footer}>
          <span>Demo data for search testing</span>
          <kbd>Esc</kbd>
          <span>to close</span>
        </footer>
      </div>
    </div>
  );
}
