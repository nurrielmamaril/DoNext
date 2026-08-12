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
    <div className="flex h-screen overflow-hidden">
      <Sidebar userEmail={email} />
      {/* On mobile the nav becomes a top bar + drawer stacked above content;
          at md+ this column is just the page itself beside the sidebar. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar userEmail={email} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
