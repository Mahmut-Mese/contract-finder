import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        // Apply to all routes, Next.js automatically ignores _next/static
        source: "/(.*)",
        headers: [
          {
            key: "X-LiteSpeed-Cache-Control",
            value: "no-cache",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
