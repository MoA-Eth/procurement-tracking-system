import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
  images: {
    qualities: [75, 100],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@moa-eth/moa-design-library",
      "date-fns",
      "recharts",
    ],
  },
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_API_URL ||
      (process.env.NODE_ENV === "development"
        ? "http://localhost:5000/api"
        : undefined);

    if (!backendUrl) return [];

    const apiBase = backendUrl.trim().replace(/\/+$/, "");
    const destination = apiBase.endsWith("/api") ? apiBase : `${apiBase}/api`;

    return [
      {
        source: "/api/integrations/:path*",
        destination: `${destination}/integrations/:path*`,
      },
    ];
  },
};

export default nextConfig;
