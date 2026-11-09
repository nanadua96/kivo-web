"use client";

import { useEffect, useState } from "react";
import { useSidebar } from "@/store";
import styles from "./ChatContainer.module.css";
import ChatMain from "./ChatMain";
import ChatSidebar from "./ChatSidebar";

export function ChatContainer() {
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
      <ChatSidebar className={styles.sidebar} />
      {initialized && expanded && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close sidebar"
          onClick={toggleSidebar}
        />
      )}
      <ChatMain className={styles.chat} />
    </div>
  );
}
