import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kjrimkgzjssoxsymaicg.supabase.co",
      },
    ],
  },
};

export default nextConfig;