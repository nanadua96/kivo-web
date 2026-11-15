"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    const errorId = error && inputId ? `${inputId}-error` : undefined;
    const describedBy = errorId ?? props["aria-describedby"];

    return (
      <div className={styles.field}>
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
        <input
          {...props}
          ref={ref}
          id={inputId}
          className={styles.input}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        {error && (
          <span className={styles.error} id={errorId}>
            {error}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;



//! FIX SORTING ERROR
//! REMOVE DARK MODE FOR NOW