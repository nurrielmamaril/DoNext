import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { RoutePrefetcher } from "@/components/layout/RoutePrefetcher";

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
      <RoutePrefetcher />
      <Sidebar userEmail={email} />
      {/* On mobile the nav becomes a top bar + drawer stacked above content;
          at md+ this column is just the page itself beside the sidebar.
          min-h-0 on the column and on <main> is load-bearing: a flex child
          defaults to min-height:auto, so without it <main> refuses to shrink
          below its content, the page grows past the screen, and anything
          anchored to the bottom (the garden) falls below the fold. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MobileTopBar userEmail={email} />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
