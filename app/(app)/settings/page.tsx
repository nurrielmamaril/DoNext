import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { NotificationSettings } from "@/components/pwa/NotificationSettings";
import { BackupRestoreSection } from "@/components/settings/BackupRestoreSection";
import { AnalyticsSection } from "@/components/settings/AnalyticsSection";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = Boolean(user?.email && user.email === process.env.OWNER_EMAIL);
  let signups: { id: string; email: string; created_at: string }[] = [];
  let totalCount = 0;

  if (isOwner) {
    const admin = createAdminClient();
    const { data, count } = await admin
      .from("profiles")
      .select("id, email, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(100);
    signups = data ?? [];
    totalCount = count ?? signups.length;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h2 className="font-heading pb-2 text-xl">Settings</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="text-sm font-medium">{user?.email}</p>
        </CardContent>
      </Card>
      <InstallPrompt />
      <NotificationSettings />
      <BackupRestoreSection />
      {isOwner && <AnalyticsSection signups={signups} totalCount={totalCount} />}
    </div>
  );
}
