"use client";

import { useEffect, useRef, useState } from "react";
import { Download, CheckCircle2, Share } from "lucide-react";
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

// iOS Safari never fires `beforeinstallprompt`, so there is no button we can
// offer — installing is a manual Share-sheet action. Detecting iOS lets us
// show the real steps instead of a prompt that will never arrive.
// iPadOS reports as "Macintosh", hence the touch-point check.
function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document)
  );
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!checkedRef.current) {
      checkedRef.current = true;
      setInstalled(isStandalone());
      // Set after mount, never during render — these read browser-only APIs
      // and would otherwise differ between the server and client markup.
      setIos(isIos());
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
            DoNext is installed. It opens like a regular app from your home screen, desktop, or
            start menu.
          </p>
        ) : ios ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Add DoNext to your Home Screen to open it like a normal app, without the Safari
              address bar:
            </p>
            <ol className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-medium text-foreground">1.</span>
                <span className="flex flex-wrap items-center gap-1">
                  Tap the Share button
                  <Share className="inline size-4 shrink-0" />
                  at the bottom of Safari
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">2.</span>
                <span>
                  Scroll down and tap <span className="text-foreground">Add to Home Screen</span>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">3.</span>
                <span>
                  Tap <span className="text-foreground">Add</span> in the top-right corner
                </span>
              </li>
            </ol>
            <p className="text-xs text-muted-foreground">
              This only works in Safari — Chrome on iPhone can&apos;t add apps to the Home Screen.
            </p>
          </div>
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
