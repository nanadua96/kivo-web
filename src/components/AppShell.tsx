"use client";

import type { ReactNode } from "react";
import { Suspense, useEffect, useState } from "react";
import { useSidebar } from "@/store";
import styles from "./AppShell.module.css";
import ChatSidebar from "./ChatSidebar";

type Props = {
  children: ReactNode;
};

export default function AppShell({ children }: Props) {
  const expanded = useSidebar((state) => state.expanded);
  const toggleSidebar = useSidebar((state) => state.toggleSidebar);
  const [initialized, setInitialized] = useState(false);

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

  return (
    <div
      className={`${styles.container} ${expanded ? "" : styles.collapse} ${initialized ? "" : styles.initializing}`}
    >
      <Suspense fallback={<div className={styles.sidebar} aria-hidden="true" />}>
        <ChatSidebar className={styles.sidebar} />
      </Suspense>
      {initialized && expanded && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close sidebar"
          onClick={toggleSidebar}
        />
      )}
      <div className={styles.workspace}>{children}</div>
    </div>
  );
}
