"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { DEFAULT_ACCENT, isAccentKey, type AccentKey } from "@/lib/theme/accents";

const AccentContext = createContext<{ accent: AccentKey; setAccent: (a: AccentKey) => void } | null>(
  null
);

function readInitialAccent(): AccentKey {
  if (typeof document === "undefined") return DEFAULT_ACCENT;
  // The inline script in the document head already set this attribute
  // before paint (avoiding a flash) — this just reads it into React state.
  // Safe from hydration mismatches since nothing renders differently based
  // on accent until the (client-only) appearance popover is opened.
  const current = document.documentElement.getAttribute("data-accent");
  return isAccentKey(current) ? current : DEFAULT_ACCENT;
}

export function AccentProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<AccentKey>(readInitialAccent);

  function setAccent(next: AccentKey) {
    setAccentState(next);
    document.documentElement.setAttribute("data-accent", next);
    localStorage.setItem("accent", next);
  }

  return <AccentContext.Provider value={{ accent, setAccent }}>{children}</AccentContext.Provider>;
}

export function useAccent() {
  const ctx = useContext(AccentContext);
  if (!ctx) throw new Error("useAccent must be used within AccentProvider");
  return ctx;
}
