"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscribeToPush, useUnsubscribeFromPush, pushSupported } from "@/lib/hooks/usePushSubscription";

type PermissionState = "unsupported" | "default" | "granted" | "denied";

export function NotificationSettings() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const subscribe = useSubscribeToPush();
  const unsubscribe = useUnsubscribeFromPush();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!checkedRef.current) {
      checkedRef.current = true;
      setPermission(pushSupported() ? (Notification.permission as PermissionState) : "unsupported");
    }
  }, []);

  async function handleEnable() {
    try {
      await subscribe.mutateAsync();
      setPermission("granted");
      toast.success("Reminder notifications are on");
    } catch (err) {
      setPermission(typeof Notification !== "undefined" ? (Notification.permission as PermissionState) : "denied");
      toast.error(err instanceof Error ? err.message : "Couldn't enable notifications");
    }
  }

  async function handleDisable() {
    try {
      await unsubscribe.mutateAsync();
      toast.success("Notifications turned off on this device");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't turn off notifications");
    }
  }

  async function handleTest() {
    try {
      if (!("serviceWorker" in navigator)) {
        throw new Error("This browser doesn't support service workers");
      }
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification("DoNext", {
        body: "This is what a reminder notification looks like.",
        icon: "/icons/icon-192.png",
      });
      toast.success("Test notification sent — check your notification area");
    } catch (err) {
      toast.error(
        err instanceof Error ? `Couldn't show notification: ${err.message}` : "Couldn't show notification"
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reminder notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {permission === "unsupported" && (
          <p className="text-sm text-muted-foreground">
            Your browser doesn&apos;t support notifications.
          </p>
        )}

        {permission === "default" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Turn these on to get notified when a task reminder comes due — even if DoNext isn&apos;t
              the open tab, as long as your browser is running.
            </p>
            <Button size="sm" onClick={handleEnable} disabled={subscribe.isPending}>
              <Bell className="size-4" /> Enable notifications
            </Button>
          </div>
        )}

        {permission === "denied" && (
          <p className="text-sm text-muted-foreground">
            Notifications are blocked for this site. To turn them on, allow notifications for DoNext
            in your browser&apos;s site settings, then reload this page.
          </p>
        )}

        {permission === "granted" && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <BellRing className="size-4 text-green-600 dark:text-green-400" />
              Notifications are on for this device.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleTest}>
                Send test notification
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDisable} disabled={unsubscribe.isPending}>
                <BellOff className="size-4" /> Turn off
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
