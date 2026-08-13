"use client";

import { useSyncExternalStore } from "react";

// useSyncExternalStore (rather than useState + useEffect) is the SSR-safe way
// to read a media query: the server snapshot is used for the initial HTML, and
// React re-renders with the real value after hydration without tripping a
// mismatch warning or the "setState in effect" lint rule.
function subscribe(query: string) {
  return (onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  };
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => false // server: assume desktop, then correct on the client
  );
}

/** Matches Tailwind's `md` breakpoint, below which the sidebar becomes a drawer. */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
