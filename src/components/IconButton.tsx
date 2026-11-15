"use client";

import type { ReactNode } from "react";
import Button, { type ButtonProps } from "./Button";
import styles from "./IconButton.module.css";

type IconButtonProps = Omit<ButtonProps, "children"> & {
  "aria-label": string;
  children: ReactNode;
};

export default function IconButton({
  children,
  className,
  ...props
}: IconButtonProps) {
  return (
    <Button
      {...props}
      className={[styles.iconButton, className ?? ""].filter(Boolean).join(" ")}
    >
      {children}
    </Button>
  );
}
