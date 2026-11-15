"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import styles from "./sign-in.module.css";

const emailSchema = z.object({
  email: z.email({
    pattern:
      /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i,
  }),
});

const otpSchema = z.object({
  otp: z
    .string()
    .length(6, "Enter the 6-digit verification code")
    .regex(/^\d{6}$/, "The code must contain only numbers"),
});

type EmailValues = z.infer<typeof emailSchema>;
type OtpValues = z.infer<typeof otpSchema>;

type SignInFormProps = {
  callbackUrl?: string;
};

export default function SignInForm({ callbackUrl }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const otpForm = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  async function sendCode(address: string) {
    const response = await authClient.emailOtp.sendVerificationOtp({
      email: address,
      type: "sign-in",
    });

    if (response.error) {
      throw new Error(response.error.message ?? "Could not send your code.");
    }
    if (!response.data?.success) {
      throw new Error("Could not send your code. Please try again.");
    }
  }

  async function handleEmailSubmit(values: EmailValues) {
    setError("");
    setNotice("");

    try {
      const normalizedEmail = values.email.trim();
      await sendCode(normalizedEmail);
      setEmail(normalizedEmail);
      otpForm.reset();
      setIsVerifying(true);
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Could not send your code. Please try again.",
      );
    }
  }

  async function handleOtpSubmit(values: OtpValues) {
    setError("");

    try {
      const response = await authClient.signIn.emailOtp({
        email,
        otp: values.otp,
      });

      if (response.error) {
        throw new Error(
          response.error.message ?? "Could not verify your code.",
        );
      }
      if (!response.data?.user) {
        throw new Error("Could not verify your code. Please try again.");
      }

      const requestedDestination =
        callbackUrl?.startsWith("/") &&
        !callbackUrl.startsWith("//") &&
        !callbackUrl.includes("\\")
          ? new URL(callbackUrl, window.location.origin)
          : null;
      const destination =
        requestedDestination?.origin === window.location.origin &&
        requestedDestination.pathname !== "/sign-in"
          ? `${requestedDestination.pathname}${requestedDestination.search}${requestedDestination.hash}`
          : "/";
      router.replace(destination);
      router.refresh();
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Could not verify your code. Please try again.",
      );
    }
  }

  async function handleResend() {
    if (isResending) return;

    setError("");
    setNotice("");
    setIsResending(true);

    try {
      await sendCode(email);
      otpForm.reset();
      setNotice("A new code has been sent to your inbox.");
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Could not send a new code. Please try again.",
      );
    } finally {
      setIsResending(false);
    }
  }

  function handleChangeEmail() {
    setError("");
    setNotice("");
    setIsVerifying(false);
    otpForm.reset();
  }

  return (
    <div className={styles.page}>
      <section className={styles.card} aria-labelledby="sign-in-title">
        <Link className={styles.brand} href="/" aria-label="Kivo home">
          kivo
        </Link>

        {!isVerifying ? (
          <>
            <header className={styles.heading}>
              <h1 id="sign-in-title">Welcome to Kivo</h1>
              <p>Sign in or create an account with your email.</p>
            </header>

            <form
              className={styles.form}
              onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
              noValidate
            >
              <div className={styles.field}>
                <label htmlFor="sign-in-email">Email address</label>
                <input
                  id="sign-in-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={Boolean(emailForm.formState.errors.email)}
                  aria-describedby={
                    emailForm.formState.errors.email
                      ? "sign-in-email-error"
                      : undefined
                  }
                  {...emailForm.register("email")}
                />
                {emailForm.formState.errors.email && (
                  <span className={styles.fieldError} id="sign-in-email-error">
                    {emailForm.formState.errors.email.message}
                  </span>
                )}
              </div>

              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}

              <button
                className={styles.submitButton}
                type="submit"
                disabled={emailForm.formState.isSubmitting}
              >
                {emailForm.formState.isSubmitting
                  ? "Sending code..."
                  : "Continue with email"}
              </button>
            </form>
          </>
        ) : (
          <>
            <header className={styles.heading}>
              <h1 id="sign-in-title">Check your email</h1>
              <p>
                Enter the 6-digit code we sent to
                <strong className={styles.email}>{email}</strong>
              </p>
            </header>

            <form
              className={styles.form}
              onSubmit={otpForm.handleSubmit(handleOtpSubmit)}
              noValidate
            >
              <div className={styles.field}>
                <label htmlFor="sign-in-otp">Verification code</label>
                <input
                  id="sign-in-otp"
                  className={styles.otpInput}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  aria-invalid={Boolean(otpForm.formState.errors.otp)}
                  aria-describedby={
                    otpForm.formState.errors.otp
                      ? "sign-in-otp-error"
                      : undefined
                  }
                  {...otpForm.register("otp", {
                    onChange: (event) => {
                      const value = event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      event.target.value = value;
                      otpForm.setValue("otp", value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    },
                  })}
                />
                {otpForm.formState.errors.otp && (
                  <span className={styles.fieldError} id="sign-in-otp-error">
                    {otpForm.formState.errors.otp.message}
                  </span>
                )}
              </div>

              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              {notice && <output className={styles.notice}>{notice}</output>}

              <button
                className={styles.submitButton}
                type="submit"
                disabled={otpForm.formState.isSubmitting}
              >
                {otpForm.formState.isSubmitting ? "Verifying..." : "Verify"}
              </button>
            </form>

            <div className={styles.actions}>
              <button type="button" onClick={handleChangeEmail}>
                Use a different email
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
              >
                {isResending ? "Sending..." : "Resend code"}
              </button>
            </div>
          </>
        )}

        <p className={styles.terms}>
          By continuing, you agree to Kivo&apos;s{" "}
          <Link href="/terms">Terms</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>
    </div>
  );
}
