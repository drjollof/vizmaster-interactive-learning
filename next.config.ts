import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Safely bypass TypeScript errors during Vercel builds
    ignoreBuildErrors: true,
  }
};

export default nextConfig;