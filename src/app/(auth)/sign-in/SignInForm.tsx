"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import Input from "@/ui/Input";
import styles from "./sign-in.module.css";

const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[0-9]/, "Password must include at least one number")
    .regex(/[^A-Za-z0-9\s]/, "Password must include at least one symbol"),
});

type SignInValues = z.infer<typeof signInSchema>;

type SignInFormProps = {
  callbackUrl?: string;
};

export default function SignInForm({ callbackUrl }: SignInFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  function redirectAfterSignIn() {
    const requestedDestination =
      callbackUrl?.startsWith("/") &&
      !callbackUrl.startsWith("//") &&
      !callbackUrl.includes("\\")
        ? new URL(callbackUrl, window.location.origin)
        : null;
    const destination =
      requestedDestination?.origin === window.location.origin &&
      requestedDestination.pathname !== "/sign-in" &&
      requestedDestination.pathname !== "/sign-up"
        ? `${requestedDestination.pathname}${requestedDestination.search}${requestedDestination.hash}`
        : "/";
    router.replace(destination);
    router.refresh();
  }

  async function handleSubmit(values: SignInValues) {
    setError("");

    try {
      const response = await authClient.signIn.email({
        email: values.email.trim(),
        password: values.password,
      });

      if (response.error) {
        throw new Error(response.error.message ?? "Could not sign in.");
      }
      if (!response.data?.user) {
        throw new Error("Could not sign in. Please try again.");
      }

      redirectAfterSignIn();
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Could not sign in. Please try again.",
      );
    }
  }

  async function handleDemoSignIn() {
    if (isDemoSubmitting || form.formState.isSubmitting) return;

    setError("");
    setIsDemoSubmitting(true);

    try {
      const email = process.env.NEXT_PUBLIC_DEMO_EMAIL;
      const password = process.env.NEXT_PUBLIC_DEMO_PASSWORD;
      if (!email || !password) {
        throw new Error(
          "The demo account is not configured. Set NEXT_PUBLIC_DEMO_EMAIL and NEXT_PUBLIC_DEMO_PASSWORD.",
        );
      }

      const response = await authClient.signIn.email({ email, password });
      if (response.error) {
        throw new Error(response.error.message ?? "Could not sign in to demo.");
      }
      if (!response.data?.user) {
        throw new Error("Could not sign in to demo. Please try again.");
      }

      redirectAfterSignIn();
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Could not sign in to demo. Please try again.",
      );
    } finally {
      setIsDemoSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.card} aria-labelledby="sign-in-title">
        <Link className={styles.brand} href="/" aria-label="Kivo home">
          kivo
        </Link>

        <header className={styles.heading}>
          <h1 id="sign-in-title">Welcome to Kivo</h1>
          <p>Sign in to continue to your account.</p>
        </header>

        <form
          className={styles.form}
          onSubmit={form.handleSubmit(handleSubmit)}
          noValidate
        >
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...form.register("email")}
            error={form.formState.errors.email?.message}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            {...form.register("password")}
            error={form.formState.errors.password?.message}
          />

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button
            className={styles.submitButton}
            type="submit"
            disabled={form.formState.isSubmitting || isDemoSubmitting}
          >
            {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className={styles.separator}>
          <span>or</span>
        </div>

        <button
          className={styles.demoButton}
          type="button"
          onClick={handleDemoSignIn}
          disabled={form.formState.isSubmitting || isDemoSubmitting}
        >
          {isDemoSubmitting ? "Opening demo..." : "Try the demo account"}
        </button>

        <p className={styles.accountPrompt}>
          Don&apos;t have an account? <Link href="/sign-up">Sign up</Link>
        </p>

        <p className={styles.terms}>
          By continuing, you agree to Kivo&apos;s terms and privacy policy.
        </p>
      </section>
    </div>
  );
}
