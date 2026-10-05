import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf.js finds its worker file next to itself; bundling it into server chunks breaks that
  // (server-side text extraction, Part 12a). The browser viewer is unaffected.
  serverExternalPackages: ["pdfjs-dist"],
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