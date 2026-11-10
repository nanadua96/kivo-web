"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { SettingsModal } from "./SettingsModal";
import styles from "./UserPopover.module.css";

export function UserPopover() {
  const { data: session, isPending } = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const email = session?.user.email ?? "Guest";
  const avatar = session?.user.name?.trim().charAt(0) || email.charAt(0) || "G";

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleSignOut() {
    setError("");
    setIsSigningOut(true);

    try {
      const result = await authClient.signOut();
      if (result.error) {
        throw new Error(result.error.message ?? "Could not sign out.");
      }
      setIsOpen(false);
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "Could not sign out. Please try again.",
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.profileButton}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Account menu for ${email}`}
        onClick={() => {
          setError("");
          setIsOpen((open) => !open);
        }}
      >
        <span className={styles.avatar} aria-hidden="true">
          {avatar.toUpperCase()}
        </span>
        <span className={styles.email} title={email}>
          {isPending ? "Loading account..." : email}
        </span>
        <svg className={styles.chevron} viewBox="0 0 20 20" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.menu} role="menu" aria-label="Account options">
          <div className={styles.menuAccount}>
            <span className={styles.avatar} aria-hidden="true">
              {avatar.toUpperCase()}
            </span>
            <span className={styles.menuEmail} title={email}>
              {email}
            </span>
          </div>
          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              setIsSettingsOpen(true);
            }}
          >
            <SettingsIcon />
            <span>Settings</span>
          </button>
          <Link
            href="/faq#feedback"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            <HelpIcon />
            <span>Help &amp; Feedback</span>
          </Link>
          <div className={styles.divider} />
          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut || !session}
          >
            <LogoutIcon />
            <span>{isSigningOut ? "Logging out..." : "Logout"}</span>
          </button>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      )}
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="m19.4 13.5 1.2.9-1.2 2.1-1.4-.5a7.8 7.8 0 0 1-1.5.9l-.2 1.5h-2.4l-.3-1.5a7.8 7.8 0 0 1-1.6-.9l-1.3.5-1.2-2.1 1.1-.9a6.5 6.5 0 0 1 0-1.8l-1.1-.9 1.2-2.1 1.3.5a7.8 7.8 0 0 1 1.6-.9l.3-1.5h2.4l.2 1.5a7.8 7.8 0 0 1 1.5.9l1.4-.5 1.2 2.1-1.2.9a6.5 6.5 0 0 1 0 1.8Z" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9a2.5 2.5 0 1 1 4.5 1.5c-1.1 1.1-2.1 1.4-2.1 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 4H5v16h5M14 8l4 4-4 4m4-4H9" />
    </svg>
  );
}
