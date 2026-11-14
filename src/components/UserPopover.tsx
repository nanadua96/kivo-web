"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Gear, Logout3 } from "reicon-react";
import { authClient } from "@/lib/auth-client";
import styles from "./UserPopover.module.css";

export function UserPopover() {
  const { data: session, isPending } = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);
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
          <Link
            href="/settings"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            <Gear />
            <span>Settings</span>
          </Link>

          <div className={styles.divider} />

          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut || !session}
          >
            <Logout3 />
            <span>{isSigningOut ? "Logging out..." : "Logout"}</span>
          </button>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
