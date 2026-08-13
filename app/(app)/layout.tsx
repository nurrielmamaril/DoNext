import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const email = user.email ?? "";

  return (
    // h-dvh (not h-screen/100vh) tracks the real visible height on mobile
    // Safari, which reports 100vh as the *expanded* viewport.
    <div className="flex h-dvh overflow-hidden">
      <Sidebar userEmail={email} />
      {/* On mobile the nav becomes a top bar + drawer stacked above content;
          at md+ this column is just the page itself beside the sidebar.
          min-h-0 on the column and on <main> is load-bearing: a flex child
          defaults to min-height:auto, so without it <main> refuses to shrink
          below its content, the page grows past the screen, and anything
          anchored to the bottom (the garden) falls below the fold. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MobileTopBar userEmail={email} />
        {/* Only the page body animates between routes — the sidebar and top
            bar are pinned by their own view-transition-names, so they stay
            put while the content crossfades. This wrapper lives in the
            layout, so it *persists* across routes and React reports the swap
            as an update rather than an enter/exit; all three carry the same
            class so the animation is identical whichever fires. `default`
            keeps it from animating during unrelated transitions. */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <ViewTransition
            update="page-swap"
            enter="page-swap"
            exit="page-swap"
            default="none"
          >
            <div className="h-full">{children}</div>
          </ViewTransition>
        </main>
      </div>
    </div>
  );
}
