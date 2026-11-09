import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
