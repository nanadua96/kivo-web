"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Input from "@/components/Input";
import { authClient } from "@/lib/auth-client";
import styles from "../sign-in/sign-in.module.css";

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your full name"),
  email: z.email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[0-9]/, "Password must include at least one number")
    .regex(/[^A-Za-z0-9\s]/, "Password must include at least one symbol"),
});

type SignUpValues = z.infer<typeof signUpSchema>;

type SignUpFormProps = {
  callbackUrl?: string;
};

export default function SignUpForm({ callbackUrl }: SignUpFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function handleSubmit(values: SignUpValues) {
    setError("");

    try {
      const response = await authClient.signUp.email({
        name: values.name,
        email: values.email.trim(),
        password: values.password,
      });

      if (response.error) {
        throw new Error(response.error.message ?? "Could not create account.");
      }
      if (!response.data?.user) {
        throw new Error("Could not create account. Please try again.");
      }

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
    } catch (signUpError) {
      setError(
        signUpError instanceof Error
          ? signUpError.message
          : "Could not create account. Please try again.",
      );
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.card} aria-labelledby="sign-up-title">
        <Link className={styles.brand} href="/" aria-label="Kivo home">
          kivo
        </Link>

        <header className={styles.heading}>
          <h1 id="sign-up-title">Create your account</h1>
          <p>Get started with Kivo.</p>
        </header>

        <form
          className={styles.form}
          onSubmit={form.handleSubmit(handleSubmit)}
          noValidate
        >
          <Input
            label="Full name"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
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
            autoComplete="new-password"
            placeholder="Create a password"
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
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className={styles.accountPrompt}>
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>

        <p className={styles.terms}>
          By creating an account, you agree to Kivo&apos;s terms and privacy
          policy.
        </p>
      </section>
    </div>
  );
}
