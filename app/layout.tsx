import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
    statusBarStyle: "default",
    title: "DoNext",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
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
              </TooltipProvider>
            </QueryProvider>
          </AccentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
