"use client";

import { type FormEvent, useActionState, useState } from "react";
import { loginAction, signupAction } from "@/app/actions/auth";
import { loginSchema, signupSchema } from "@/lib/auth/schemas";
import type { AuthActionResult } from "@/lib/auth/types";

type AuthMode = "signup" | "login";

type FieldName = "name" | "email" | "password";

type FormValues = {
  name: string;
  email: string;
  password: string;
};

type FormErrors = Partial<Record<FieldName, string[]>>;

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const [values, setValues] = useState<FormValues>({
    name: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>(
    {},
  );

  const isSignup = mode === "signup";

  const schema = isSignup ? signupSchema : loginSchema;
  const [actionResult, formAction, isPending] = useActionState<
    AuthActionResult,
    FormData
  >(isSignup ? signupAction : loginAction, { ok: false, message: "" });

  /********************************************
   * VALIDATE INDIVIDUAL FIELD
   ********************************************/
  function validateField(field: FieldName, value: string) {
    const result = schema.safeParse({
      ...values,
      [field]: value,
    });

    const fieldErrors = result.success
      ? []
      : result.error.issues
          .filter((issue) => issue.path[0] === field)
          .map((issue) => issue.message);

    setErrors((previous) => {
      const next = { ...previous };

      if (fieldErrors.length) {
        next[field] = fieldErrors;
      } else {
        delete next[field];
      }

      return next;
    });
  }

  /********************************************
   * INPUT CHANGE
   ********************************************/

  function handleChange(field: FieldName, value: string) {
    setValues((previous) => ({
      ...previous,
      [field]: value,
    }));

    // Only validate while typing after the first blur.
    if (touched[field]) {
      validateField(field, value);
    }
  }

  /********************************************
   * INPUT BLUR
   ********************************************/

  function handleBlur(field: FieldName, value: string) {
    setTouched((previous) => ({
      ...previous,
      [field]: true,
    }));

    validateField(field, value);
  }

  /********************************************
   * VALIDATE ALL FIELDS
   ********************************************/

  function validateForm(data: FormValues): boolean {
    const payload = isSignup
      ? data
      : {
          email: data.email,
          password: data.password,
        };

    const result = schema.safeParse(payload);

    if (result.success) {
      setErrors({});
      return true;
    }

    const nextErrors: FormErrors = {};

    for (const issue of result.error.issues) {
      const field = issue.path[0];

      if (field === "name" || field === "email" || field === "password") {
        nextErrors[field] = [...(nextErrors[field] ?? []), issue.message];
      }
    }

    setErrors(nextErrors);

    setTouched(
      isSignup
        ? { name: true, email: true, password: true }
        : { email: true, password: true },
    );

    return false;
  }

  /********************************************
   * SUBMIT
   ********************************************/

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!validateForm(values)) {
      event.preventDefault();
    }
  }

  /********************************************
   * RENDER FIELD ERRORS
   ********************************************/

  function renderErrors(field: FieldName) {
    const fieldErrors = errors[field];

    if (!fieldErrors?.length) {
      return null;
    }

    return (
      <ul id={`${field}-errors`} role="alert">
        {fieldErrors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    );
  }

  /********************************************
   * FORM
   ********************************************/

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate>
      {/* NAME */}
      {isSignup && (
        <div>
          <label htmlFor="name">Name</label>

          <input
            id="name"
            name="name"
            type="text"
            value={values.name}
            autoComplete="name"
            onChange={(event) => handleChange("name", event.target.value)}
            onBlur={(event) => handleBlur("name", event.target.value)}
            aria-invalid={!!errors.name?.length}
            aria-describedby={errors.name?.length ? "name-errors" : undefined}
          />

          {renderErrors("name")}
        </div>
      )}

      {/* EMAIL */}
      <div>
        <label htmlFor="email">Email</label>

        <input
          id="email"
          name="email"
          type="email"
          value={values.email}
          autoComplete="email"
          onChange={(event) => handleChange("email", event.target.value)}
          onBlur={(event) => handleBlur("email", event.target.value)}
          aria-invalid={!!errors.email?.length}
          aria-describedby={errors.email?.length ? "email-errors" : undefined}
        />

        {renderErrors("email")}
      </div>

      {/* PASSWORD */}
      <div>
        <label htmlFor="password">Password</label>

        <input
          id="password"
          name="password"
          type="password"
          value={values.password}
          autoComplete={isSignup ? "new-password" : "current-password"}
          onChange={(event) => handleChange("password", event.target.value)}
          onBlur={(event) => handleBlur("password", event.target.value)}
          aria-invalid={!!errors.password?.length}
          aria-describedby={
            errors.password?.length ? "password-errors" : undefined
          }
        />

        {renderErrors("password")}
      </div>

      {/* SERVER ERROR */}
      {!actionResult.ok && actionResult.message && !isPending && (
        <p role="alert">{actionResult.message}</p>
      )}

      {/* SUBMIT */}
      <button type="submit" disabled={isPending}>
        {isPending ? "Please wait..." : isSignup ? "Create account" : "Login"}
      </button>
    </form>
  );
}
