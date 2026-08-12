"use client";

import { useRef } from "react";
import { useSidebarPrefs, MIN_WIDTH, MAX_WIDTH } from "@/lib/hooks/useSidebarPrefs";
import { SidebarContent } from "@/components/layout/SidebarContent";

// Desktop only — below `md` the same nav renders inside MobileTopBar's drawer.
export function Sidebar({ userEmail }: { userEmail: string }) {
  const { toggleCollapsed, setWidth } = useSidebarPrefs();
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  function handleResizePointerMove(e: PointerEvent) {
    if (!dragState.current) return;
    const next = Math.min(
      Math.max(dragState.current.startWidth + (e.clientX - dragState.current.startX), MIN_WIDTH),
      MAX_WIDTH
    );
    document.documentElement.style.setProperty("--sidebar-width", `${next}px`);
  }

  function handleResizePointerUp(e: PointerEvent) {
    if (!dragState.current) return;
    const next = Math.min(
      Math.max(dragState.current.startWidth + (e.clientX - dragState.current.startX), MIN_WIDTH),
      MAX_WIDTH
    );
    setWidth(next);
    dragState.current = null;
    window.removeEventListener("pointermove", handleResizePointerMove);
    window.removeEventListener("pointerup", handleResizePointerUp);
  }

  function handleResizePointerDown(e: React.PointerEvent) {
    dragState.current = {
      startX: e.clientX,
      startWidth: parseInt(
        getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width"),
        10
      ),
    };
    window.addEventListener("pointermove", handleResizePointerMove);
    window.addEventListener("pointerup", handleResizePointerUp);
  }

  return (
    <aside
      className="sidebar-aside relative hidden h-screen shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex"
      style={{ width: "var(--sidebar-width)" }}
    >
      <SidebarContent userEmail={userEmail} onToggleCollapsed={toggleCollapsed} />

      <div
        data-collapse-hide
        onPointerDown={handleResizePointerDown}
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-accent"
        aria-hidden
      />
    </aside>
  );
}
