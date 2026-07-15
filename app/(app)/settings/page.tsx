import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { NotificationSettings } from "@/components/pwa/NotificationSettings";
import { BackupRestoreSection } from "@/components/settings/BackupRestoreSection";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    </div>
  );
}
