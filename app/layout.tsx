import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AccentProvider } from "@/components/providers/AccentProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DoNext",
  description: "Simple task, reminder, and note management",
  appleWebApp: {
    capable: true,
    // "black-translucent" lets the page paint underneath the status bar, so
    // the top bar's own background continues right up behind the clock and
    // battery instead of iOS drawing its own grey band. The safe-area padding
    // on MobileTopBar is what keeps the content itself clear of it.
    statusBarStyle: "black-translucent",
    title: "DoNext",
  },
  // iOS ignores the manifest's icons entirely and needs its own link tag.
  // Next only auto-detects icon files placed in app/, not public/, so this
  // is declared explicitly — without it the home-screen icon is a screenshot.
  icons: {
    apple: "/apple-touch-icon.png",
  },
  other: {
    // Next emits the modern `mobile-web-app-capable`; older iOS versions only
    // recognise the apple-prefixed form, and having both is harmless.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  // Was a fixed near-black, which clashed with the light UI. Now it follows
  // the active colour scheme so the browser/OS chrome matches the app.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  // Lets the app paint edge-to-edge under the notch/home indicator when
  // launched from the home screen; the safe-area padding in globals.css keeps
  // actual content clear of them.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          // Sets the accent color before first paint so there's no flash of
          // the default accent — mirrors how next-themes avoids the same
          // problem for light/dark.
          dangerouslySetInnerHTML={{
            __html:
              "try{var a=localStorage.getItem('accent');if(a)document.documentElement.setAttribute('data-accent',a);}catch(e){}",
          }}
        />
        <script
          // Same flash-avoidance trick for the sidebar's collapsed state and
          // custom width — set before paint so the sidebar never briefly
          // renders at the wrong size.
          dangerouslySetInnerHTML={{
            __html:
              "try{var c=localStorage.getItem('sidebarCollapsed');if(c)document.documentElement.setAttribute('data-sidebar-collapsed',c);var w=localStorage.getItem('sidebarWidth');if(w)document.documentElement.style.setProperty('--sidebar-width',w+'px');}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AccentProvider>
            <QueryProvider>
              <TooltipProvider>
                {children}
                <Toaster />
                <ServiceWorkerRegistration />
                <Analytics />
              </TooltipProvider>
            </QueryProvider>
          </AccentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
