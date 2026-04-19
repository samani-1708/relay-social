"use client";

import { createContext, useContext, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { lightTheme, darkTheme, ThemeMode } from "@/lib/theme";

/* ── Context ──────────────────────────────────────────────────────── */
interface ThemeCtx {
  mode: ThemeMode;
  toggle: () => void;
}

export const ThemeModeContext = createContext<ThemeCtx>({
  mode: "light",
  toggle: () => {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

/* ── Reads the value injected by the blocking script in layout.tsx ── */
function getInitialMode(): ThemeMode {
  if (typeof document !== "undefined") {
    const val = document.documentElement.getAttribute("data-theme");
    if (val === "dark" || val === "light") return val;
  }
  return "light";
}

/* ── Provider ─────────────────────────────────────────────────────── */
export function Providers({ children }: { children: React.ReactNode }) {
  // Lazy initializer: on the client the blocking script has already set
  // data-theme before React hydrates, so this reads the correct value
  // synchronously — no flash, no useEffect delay.
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);

  const toggle = () => {
    const next: ThemeMode = mode === "light" ? "dark" : "light";
    setMode(next);
    try {
      localStorage.setItem("relayman-theme", next);
      document.documentElement.setAttribute("data-theme", next);
    } catch {}
  };

  return (
    <ThemeModeContext.Provider value={{ mode, toggle }}>
      <ThemeProvider theme={mode === "dark" ? darkTheme : lightTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
