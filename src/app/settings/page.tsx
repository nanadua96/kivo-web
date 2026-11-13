"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import ChatSidebar from "@/components/ChatSidebar";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useSidebar } from "@/store";
import styles from "./settings.module.css";

const nameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name.")
    .max(80, "Use 80 characters or fewer."),
});

type NameForm = z.infer<typeof nameSchema>;
type ConfirmAction = "account" | "chats" | null;

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const expanded = useSidebar((state) => state.expanded);
  const toggleSidebar = useSidebar((state) => state.toggleSidebar);

  const [initialized, setInitialized] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeletingChats, setIsDeletingChats] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: session?.user.name ?? "" },
  });

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 800px)");

    const initializeSidebar = () => {
      if (mobileQuery.matches && useSidebar.getState().expanded) {
        useSidebar.getState().toggleSidebar();
      }

      setInitialized(true);
    };

    initializeSidebar();
    mobileQuery.addEventListener("change", initializeSidebar);
    return () => mobileQuery.removeEventListener("change", initializeSidebar);
  }, []);

  useEffect(() => {
    reset({ name: session?.user.name ?? "" });
  }, [reset, session?.user.name]);

  const isBusy = isSavingName || isDeletingAccount || isDeletingChats;
  const email = session?.user.email ?? "";
  const avatar = session?.user.name?.trim().charAt(0) || email.charAt(0) || "?";

  async function saveName(values: NameForm) {
    setActionError("");
    setActionMessage("");
    setIsSavingName(true);

    try {
      const result = await authClient.updateUser({ name: values.name });
      if (result.error) {
        throw new Error(result.error.message ?? "Could not save your name.");
      }
      reset({ name: values.name });
      setActionMessage("Your name has been saved.");
    } catch (error) {
      setError("name", {
        message:
          error instanceof Error ? error.message : "Could not save your name.",
      });
    } finally {
      setIsSavingName(false);
    }
  }

  async function deleteAccount() {
    setActionError("");
    setIsDeletingAccount(true);

    try {
      const result = await authClient.deleteUser({});
      if (result.error) {
        throw new Error(
          result.error.message ?? "Could not delete your account.",
        );
      }

      const signOutResult = await authClient.signOut();
      if (signOutResult.error) {
        throw new Error(
          signOutResult.error.message ??
            "Your account was deleted, but sign-out failed.",
        );
      }

      router.replace("/sign-in");
      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not delete your account. Please try again.",
      );
    } finally {
      setIsDeletingAccount(false);
      setConfirmAction(null);
    }
  }

  async function deleteAllChats() {
    setActionError("");
    setActionMessage("");
    setIsDeletingChats(true);

    try {
      await api.delete("/api/v1/conversations");
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setActionMessage("All conversations have been deleted.");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not delete conversations. Please try again.",
      );
    } finally {
      setIsDeletingChats(false);
      setConfirmAction(null);
    }
  }

  return (
    <div
      className={`${styles.container} ${expanded ? "" : styles.collapse} ${initialized ? "" : styles.initializing}`}
    >
      <ChatSidebar className={styles.sidebar} />
      {initialized && expanded && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close sidebar"
          onClick={toggleSidebar}
        />
      )}

      <main className={styles.workspace}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.sidebarToggle}
            aria-label={expanded ? "Collapse sidebar" : "Open sidebar"}
            onClick={toggleSidebar}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <p className={styles.eyebrow}>Preferences</p>
            <h1>Settings</h1>
          </div>
        </header>

        <div className={styles.content}>
          <form
            className={styles.form}
            onSubmit={handleSubmit(saveName)}
            noValidate
          >
            <section className={styles.card} aria-labelledby="profile-heading">
              <div className={styles.sectionHeading}>
                <h2 id="profile-heading">Profile</h2>
                <p>Manage your account details.</p>
              </div>

              <div className={styles.profile}>
                <span className={styles.avatar} aria-hidden="true">
                  {avatar.toUpperCase()}
                </span>
                <div className={styles.profileInfo}>
                  <strong>
                    {email ||
                      (isSessionPending
                        ? "Loading account..."
                        : "No email available")}
                  </strong>
                  <span>Email address</span>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="settings-name">Name</label>
                <input
                  id="settings-name"
                  autoComplete="name"
                  maxLength={80}
                  disabled={!session || isSavingName}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={
                    errors.name ? "settings-name-error" : "settings-name-help"
                  }
                  {...register("name")}
                />
                {errors.name ? (
                  <span
                    className={styles.error}
                    id="settings-name-error"
                    role="alert"
                  >
                    {errors.name.message}
                  </span>
                ) : (
                  <span className={styles.helper} id="settings-name-help">
                    This name appears on your account. Use up to 80 characters.
                  </span>
                )}
              </div>

              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={
                    !session || !isDirty || isSavingName || isSessionPending
                  }
                >
                  {isSavingName ? "Saving..." : "Save changes"}
                </button>
              </div>
            </section>

            <section className={styles.card} aria-labelledby="data-heading">
              <div className={styles.sectionHeading}>
                <h2 id="data-heading">Your data</h2>
                <p>Manage your account and saved conversations.</p>
              </div>

              <div className={styles.dangerZone}>
                <div className={styles.dangerAction}>
                  <div>
                    <strong>Delete all chats</strong>
                    <span>
                      Permanently remove every conversation from your account.
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    disabled={!session || isBusy}
                    onClick={() => {
                      setActionError("");
                      setConfirmAction("chats");
                    }}
                  >
                    Delete all chats
                  </button>
                </div>

                <div className={styles.dangerAction}>
                  <div>
                    <strong>Delete account</strong>
                    <span>Permanently delete your account and sign out.</span>
                  </div>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    disabled={!session || isBusy}
                    onClick={() => {
                      setActionError("");
                      setConfirmAction("account");
                    }}
                  >
                    Delete account
                  </button>
                </div>
              </div>

              {actionMessage && (
                <output className={styles.success}>{actionMessage}</output>
              )}
              {actionError && (
                <p className={styles.error} role="alert">
                  {actionError}
                </p>
              )}
            </section>
          </form>

          <footer className={styles.footer}>
            <span>About Kivo</span>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </footer>
        </div>
      </main>

      {confirmAction && (
        <div className={styles.confirmBackdrop}>
          <section
            className={styles.confirmDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="settings-confirm-title"
          >
            <h2 id="settings-confirm-title">
              {confirmAction === "account"
                ? "Delete your account?"
                : "Delete all chats?"}
            </h2>
            <p>
              {confirmAction === "account"
                ? "This permanently deletes your account. This action cannot be undone."
                : "This permanently deletes all conversations. This action cannot be undone."}
            </p>
            {actionError && (
              <p className={styles.error} role="alert">
                {actionError}
              </p>
            )}
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={isBusy}
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                disabled={isBusy}
                onClick={() =>
                  void (confirmAction === "account"
                    ? deleteAccount()
                    : deleteAllChats())
                }
              >
                {isBusy ? "Please wait..." : "Confirm delete"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
