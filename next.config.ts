import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // ---------------------------------------------------------------------------
  // Middleware compatibility (Next.js 16+)
  //
  // Next.js 16 deprecates middleware in favor of proxy/instrumentation hooks.
  // Auth guards are not supported by the proxy API, so we keep middleware.ts
  // active via the compatibility layer. The primary auth logic has been moved
  // to the (main)/layout.tsx server component; middleware remains as a
  // defense-in-depth layer for cookie refresh and edge-case protection.
  //
  // TODO: Once Next.js provides a first-class server-component auth hook or
  // the proxy API supports auth redirects, remove middleware.ts entirely.
  // ---------------------------------------------------------------------------
};

export default nextConfig;
