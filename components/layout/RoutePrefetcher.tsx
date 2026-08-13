"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { navRoutes } from "@/components/layout/navItems";

// Warms every section's payload as soon as the app shell mounts.
//
// <Link prefetch> only fires once a link is on screen, which is fine on
// desktop where the sidebar is always visible — but on mobile the nav lives
// inside the drawer, so its links don't exist until the drawer opens. Tapping
// a section a moment later would then race the prefetch and still pause.
// Warming up front means the payload is already in the router cache by the
// time the drawer is ever opened.
export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    const warm = () => {
      for (const href of navRoutes) router.prefetch(href);
    };
    // Yield to first paint — startup rendering matters more than these.
    const id = window.setTimeout(warm, 400);

    // Prefetched payloads go stale after a few minutes, so re-warm whenever
    // the app comes back to the foreground — which is exactly when the next
    // navigation is about to happen.
    const onVisible = () => {
      if (document.visibilityState === "visible") warm();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
