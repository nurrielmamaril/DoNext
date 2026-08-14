"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarContent } from "@/components/layout/SidebarContent";
import { useNavPrefetch } from "@/lib/hooks/useNavPrefetch";

// Below `md` the fixed-width sidebar would eat most of a phone screen, so the
// same nav moves into a slide-in drawer behind a hamburger.
export function MobileTopBar({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  const prefetchNav = useNavPrefetch();

  // Close on navigation. Links call onNavigate directly; this also covers
  // back/forward and programmatic redirects. Adjusting state during render
  // (rather than in an effect) is React's documented pattern for reacting to
  // a changed input, and avoids the extra render pass an effect would cost.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (open) setOpen(false);
  }

  return (
    <div className="md:hidden">
      {/* relative + z-30 keeps the bar (and its menu button) above the
          dashboard's viewport-pinned garden layer, which would otherwise
          paint over it and eat taps. */}
      <header className="safe-top relative z-30 flex items-center gap-2 border-b bg-sidebar px-3 py-2 text-sidebar-foreground">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          // Start loading the sections' contents as the finger goes down, so
          // by the time a section is picked its rows are already in hand and
          // the page appears filled rather than blank.
          onPointerDown={prefetchNav}
          onClick={() => setOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
        <span className="font-heading text-base">DoNext</span>
      </header>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <DialogPrimitive.Popup
            // A floating, fully rounded sheet rather than a full-bleed
            // rectangle — `drawer-inset` holds it clear of every edge
            // (including the notch) so all four corners actually show.
            className="drawer-inset fixed z-50 flex w-[min(19rem,82vw)] flex-col overflow-hidden rounded-2xl border bg-sidebar text-sidebar-foreground shadow-2xl duration-200 data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left"
            aria-label="Navigation"
          >
            <DialogPrimitive.Close
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close menu"
                  className="absolute top-3 right-3 z-10"
                />
              }
            >
              <X className="size-5" />
            </DialogPrimitive.Close>

            {/* Deliberately does NOT close on tap. Closing immediately tore
                the drawer away while the next page was still loading, so the
                page you were leaving flashed back into view for a moment
                before the new one arrived — that flash was the "flicker".
                The drawer now stays up until the route actually changes (see
                the pathname check above), so it lifts to reveal the new page
                directly. The one case pathname can't catch is tapping the
                section you're already on, which is closed here. */}
            <SidebarContent
              userEmail={userEmail}
              onNavigate={(href) => {
                if (href === pathname) setOpen(false);
              }}
            />
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
