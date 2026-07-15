"use client";

import { useEffect, useRef, useState } from "react";
import { Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!checkedRef.current) {
      checkedRef.current = true;
      setInstalled(isStandalone());
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setInstalled(true);
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setInstallEvent(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Install as an app</CardTitle>
      </CardHeader>
      <CardContent>
        {installed ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
            DoNext is installed. It opens like a regular app from your desktop or start menu.
          </p>
        ) : installEvent ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Install DoNext for its own window, a desktop icon, and notifications that work in the
              background.
            </p>
            <Button size="sm" onClick={handleInstall}>
              <Download className="size-4" /> Install DoNext
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your browser hasn&apos;t offered an install prompt yet. In Chrome or Edge, look for an
            install icon in the address bar, or check back after using the app a bit more.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
