import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        // Prevent caching of HTML pages — critical to avoid serving stale
        // HTML after a new deployment (which causes ChunkLoadErrors)
        source: "/((?!_next/static|_next/image|favicon\\.ico).*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
          // LiteSpeed-specific header to bypass Hostinger's page cache
          { key: "X-LiteSpeed-Cache-Control", value: "no-cache" },
        ],
      },
      {
        // Static JS/CSS assets have content hashes in filenames — safe to cache long-term
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
