import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    // Lets route navigations run through the browser's View Transitions API,
    // so moving between pages crossfades instead of snapping. Next swaps in a
    // React build that exports <ViewTransition> when this is on.
    viewTransition: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Windows' native file-watcher (ReadDirectoryChangesW via libuv) crashes
      // intermittently on this machine with "Assertion failed: fs-event.c".
      // Polling avoids the native watcher entirely.
      config.watchOptions = { poll: 1000, aggregateTimeout: 300 };
    }
    return config;
  },
};

export default nextConfig;
