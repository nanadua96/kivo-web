"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast, useSonner } from "sonner";
import { z } from "zod";
import { Icon } from "@/components/Icons";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useSidebar } from "@/store";
import Avatar from "@/ui/Avatar";
import Button from "@/ui/Button";
import IconButton from "@/ui/IconButton";
import Input from "@/ui/Input";
import styles from "./page.module.css";

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
    reset({ name: session?.user.name ?? "" });
  }, [reset, session?.user.name]);

  const isBusy = isSavingName || isDeletingAccount || isDeletingChats;
  const email = session?.user.email ?? "";
  const displayName = session?.user.name?.trim() || "";

  const { toasts } = useSonner();

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

      toast.success("Your name has been saved.");
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
      await api.delete("/api/v1/conversations/delete/all");
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
    <main className={styles.workspace}>
      <header className={styles.header}>
        {!expanded && (
          <IconButton
            variant="outline"
            type="button"
            aria-label="Open sidebar"
            onClick={toggleSidebar}
          >
            <Icon name="ic_fluent_panel_left_default_28_regular" />
          </IconButton>
        )}
        <div>
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
            <div className={styles.profile}>
              <Avatar name={displayName || email} size="lg" />
              <div className={styles.profileInfo}>
                <strong>
                  {email ||
                    (isSessionPending
                      ? "Loading account..."
                      : "No email available")}
                </strong>
              </div>
            </div>

            <div className={styles.nameFieldRow}>
              <div className={styles.nameField}>
                <Input
                  label="Name"
                  id="settings-name"
                  autoComplete="name"
                  maxLength={80}
                  disabled={!session || isSavingName}
                  aria-describedby={
                    errors.name ? undefined : "settings-name-help"
                  }
                  {...register("name")}
                  error={errors.name?.message}
                />
                {!errors.name && (
                  <span className={styles.helper} id="settings-name-help">
                    This name appears on your account. Use up to 80 characters.
                  </span>
                )}
              </div>
              <Button
                type="submit"
                variant="solid"
                className={styles.saveButton}
                loading={isSavingName}
                disabled={
                  !session || !isDirty || isSavingName || isSessionPending
                }
              >
                Save changes
              </Button>
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

            {actionError && (
              <p className={styles.error} role="alert">
                {actionError}
              </p>
            )}
          </section>
        </form>
      </div>
      {/* Modal */}
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
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <button
                type="button"
                className={styles.dangerButton}
                disabled={isBusy}
                onClick={() =>
                  confirmAction === "account"
                    ? deleteAccount()
                    : deleteAllChats()
                }
              >
                {isBusy ? "Please wait..." : "Confirm delete"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
