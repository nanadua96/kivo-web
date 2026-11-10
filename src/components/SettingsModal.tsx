"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import styles from "./SettingsModal.module.css";

const themeModes = ["dark", "light", "system"] as const;
type ThemeMode = (typeof themeModes)[number];
type Section = "Appearance" | "Account" | "Data" | "About";
const sections: Section[] = ["Appearance", "Account", "Data", "About"];

const nameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name.")
    .max(80, "Use 80 characters or fewer."),
});
type NameForm = z.infer<typeof nameSchema>;

type Props = {
  onClose: () => void;
};

function getStoredTheme(): ThemeMode {
  const savedTheme = window.localStorage.getItem("kivo-theme");
  return themeModes.includes(savedTheme as ThemeMode)
    ? (savedTheme as ThemeMode)
    : "system";
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.dataset.themePreference = mode;
  root.dataset.theme =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  root.style.colorScheme = root.dataset.theme;
}

export function SettingsModal({ onClose }: Props) {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<Section>("Appearance");
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeletingChats, setIsDeletingChats] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "account" | "chats" | null
  >(null);
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
    const savedTheme = getStoredTheme();
    setTheme(savedTheme);
    applyTheme(savedTheme);
    setThemeLoaded(true);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeletingAccount && !isDeletingChats) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDeletingAccount, isDeletingChats, onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!themeLoaded || theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => {
      document.documentElement.dataset.theme = mediaQuery.matches
        ? "dark"
        : "light";
      document.documentElement.style.colorScheme =
        document.documentElement.dataset.theme;
    };

    updateSystemTheme();
    mediaQuery.addEventListener("change", updateSystemTheme);
    return () => mediaQuery.removeEventListener("change", updateSystemTheme);
  }, [theme, themeLoaded]);

  useEffect(() => {
    reset({ name: session?.user.name ?? "" });
  }, [reset, session?.user.name]);

  function chooseTheme(mode: ThemeMode) {
    setTheme(mode);
    window.localStorage.setItem("kivo-theme", mode);
    applyTheme(mode);
    window.dispatchEvent(
      new CustomEvent("kivo-theme-change", { detail: mode }),
    );
  }

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
      await authClient.signOut();
      onClose();
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

  const busy = isSavingName || isDeletingAccount || isDeletingChats;

  return typeof document === "undefined"
    ? null
    : createPortal(
        <div className={styles.backdrop}>
          <button
            type="button"
            className={styles.backdropDismiss}
            aria-label="Close settings"
            onClick={onClose}
            disabled={busy || Boolean(confirmAction)}
          />
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <header className={styles.header}>
              <div>
                <p className={styles.eyebrow}>Preferences</p>
                <h1 id="settings-title">Settings</h1>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                aria-label="Close settings"
                onClick={onClose}
                disabled={busy}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="m5 5 10 10M15 5 5 15" />
                </svg>
              </button>
            </header>

            <div className={styles.body}>
              <nav className={styles.navigation} aria-label="Settings sections">
                {sections.map((section) => (
                  <button
                    type="button"
                    key={section}
                    className={`${styles.navButton} ${activeSection === section ? styles.navButtonActive : ""}`}
                    aria-current={
                      activeSection === section ? "page" : undefined
                    }
                    onClick={() => {
                      setActionError("");
                      setActionMessage("");
                      setConfirmAction(null);
                      setActiveSection(section);
                    }}
                  >
                    {section}
                  </button>
                ))}
              </nav>

              <div className={styles.panel}>
                {activeSection === "Appearance" && (
                  <section aria-labelledby="appearance-heading">
                    <h2 id="appearance-heading">Appearance</h2>
                    <p className={styles.description}>
                      Choose how Kivo looks on this device.
                    </p>
                    <fieldset className={styles.themeOptions}>
                      <legend className={styles.themeLegend}>
                        Color theme
                      </legend>
                      {themeModes.map((mode) => (
                        <button
                          type="button"
                          key={mode}
                          className={`${styles.themeOption} ${theme === mode ? styles.themeOptionActive : ""}`}
                          aria-pressed={theme === mode}
                          onClick={() => chooseTheme(mode)}
                        >
                          <span
                            className={`${styles.themePreview} ${styles[`themePreview${mode}`]}`}
                          >
                            <span />
                            <span />
                          </span>
                          <span>{mode[0].toUpperCase() + mode.slice(1)}</span>
                          <span className={styles.radio} aria-hidden="true" />
                        </button>
                      ))}
                    </fieldset>
                  </section>
                )}

                {activeSection === "Account" && (
                  <section aria-labelledby="account-heading">
                    <h2 id="account-heading">Account</h2>
                    <p className={styles.description}>
                      Your account is used to sign in and sync your
                      conversations.
                    </p>
                    <div className={styles.infoCard}>
                      <span className={styles.infoLabel}>Status</span>
                      <span className={styles.infoValue}>
                        {isSessionPending
                          ? "Checking session..."
                          : session
                            ? "Signed in"
                            : "Guest session"}
                      </span>
                    </div>
                    {!session && !isSessionPending && (
                      <p className={styles.helper}>
                        Sign in to manage account details and saved
                        conversations.
                      </p>
                    )}
                  </section>
                )}

                {activeSection === "Data" && (
                  <section aria-labelledby="data-heading">
                    <h2 id="data-heading">Data</h2>
                    <p className={styles.description}>
                      Manage your account information and saved conversations.
                    </p>

                    <div className={styles.dataFields}>
                      <div className={styles.field}>
                        <label htmlFor="settings-email">Email</label>
                        <input
                          id="settings-email"
                          value={session?.user.email ?? ""}
                          readOnly
                          placeholder={
                            isSessionPending ? "Loading..." : "Not signed in"
                          }
                        />
                        <span className={styles.helper}>
                          Email cannot be changed here.
                        </span>
                      </div>

                      <form
                        className={styles.field}
                        onSubmit={handleSubmit(saveName)}
                      >
                        <label htmlFor="settings-name">Name</label>
                        <div className={styles.nameInputGroup}>
                          <input
                            id="settings-name"
                            {...register("name")}
                            maxLength={80}
                            disabled={!session || isSavingName}
                          />
                          <button
                            type="submit"
                            className={styles.primaryButton}
                            disabled={!session || !isDirty || isSavingName}
                          >
                            {isSavingName ? "Saving..." : "Save"}
                          </button>
                        </div>
                        {errors.name && (
                          <span className={styles.error} role="alert">
                            {errors.name.message}
                          </span>
                        )}
                        <span className={styles.helper}>
                          Up to 80 characters.
                        </span>
                      </form>
                    </div>

                    <div className={styles.dangerZone}>
                      <h3>Delete data</h3>
                      <p>These actions are permanent and cannot be undone.</p>
                      <div className={styles.dangerAction}>
                        <div>
                          <strong>Delete all chats</strong>
                          <span>
                            Remove every conversation from your account.
                          </span>
                        </div>
                        <button
                          type="button"
                          className={styles.dangerButton}
                          disabled={!session || busy}
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
                          <span>
                            Permanently delete your account and sign out.
                          </span>
                        </div>
                        <button
                          type="button"
                          className={styles.dangerButton}
                          disabled={!session || busy}
                          onClick={() => {
                            setActionError("");
                            setConfirmAction("account");
                          }}
                        >
                          Delete account
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {activeSection === "About" && (
                  <section aria-labelledby="about-heading">
                    <h2 id="about-heading">About Kivo</h2>
                    <p className={styles.description}>
                      Find the current service information and policies.
                    </p>
                    <div className={styles.aboutLinks}>
                      <Link href="/terms" onClick={onClose}>
                        <span>
                          <strong>Terms of Service</strong>
                          <small>Rules for using Kivo</small>
                        </span>
                        <span aria-hidden="true">↗</span>
                      </Link>
                      <Link href="/privacy" onClick={onClose}>
                        <span>
                          <strong>Privacy Policy</strong>
                          <small>How information is handled</small>
                        </span>
                        <span aria-hidden="true">↗</span>
                      </Link>
                    </div>
                  </section>
                )}

                {actionMessage && (
                  <output className={styles.success}>{actionMessage}</output>
                )}
                {actionError && (
                  <p className={styles.error} role="alert">
                    {actionError}
                  </p>
                )}
              </div>
            </div>

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
                  <div className={styles.confirmActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      disabled={busy}
                      onClick={() => setConfirmAction(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      disabled={busy}
                      onClick={() =>
                        void (confirmAction === "account"
                          ? deleteAccount()
                          : deleteAllChats())
                      }
                    >
                      {busy ? "Please wait..." : "Confirm delete"}
                    </button>
                  </div>
                </section>
              </div>
            )}
          </section>
        </div>,
        document.body,
      );
}
