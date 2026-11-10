"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("kivo-theme");
    let preference =
      storedTheme === "dark" || storedTheme === "light"
        ? storedTheme
        : "system";
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const theme =
        preference === "system"
          ? mediaQuery.matches
            ? "dark"
            : "light"
          : preference;
      document.documentElement.dataset.themePreference = preference;
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    }

    function handleThemeChange(event: Event) {
      if (!(event instanceof CustomEvent)) return;
      const mode = event.detail;
      if (mode !== "dark" && mode !== "light" && mode !== "system") return;
      preference = mode;
      applyTheme();
    }

    applyTheme();
    mediaQuery.addEventListener("change", applyTheme);
    window.addEventListener("kivo-theme-change", handleThemeChange);
    return () => {
      mediaQuery.removeEventListener("change", applyTheme);
      window.removeEventListener("kivo-theme-change", handleThemeChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
