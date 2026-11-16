"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Settings, SignOut } from "@/ui";
import Avatar from "@/ui/Avatar";
import styles from "./UserPopover.module.css";

export function UserPopover() {
  const { data: session, isPending } = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const email = session?.user.email ?? "Guest";
  const name = session?.user.name?.trim();

  const router = useRouter();

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
      // const result = await authClient.signOut();

      // if (result.error)
      //   throw new Error(result.error.message ?? "Could not sign out.");

      // setIsOpen(false);

      // router.replace("/sign-in");
      // router.refresh();

      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            setIsOpen(false);
            router.replace("/sign-in");
            router.refresh();
          },
          onError: (ctx) => {
            setError(ctx.error.message ?? "Could not sign out.");
          },
        },
      });
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
        <Avatar name={name || email} size="sm" />
        <span className={styles.email} title={name || email}>
          {isPending ? "Loading account..." : name || email}
        </span>
      </button>

      {isOpen && (
        <div className={styles.menu} role="menu" aria-label="Account options">
          <Link
            href="/settings"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            <Settings />
            <span>Settings</span>
          </Link>

          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => handleSignOut()}
            disabled={isSigningOut || !session}
          >
            <SignOut />
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
