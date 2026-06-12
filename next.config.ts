import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias.canvas = false;
    }
    return config;
  },
  turbopack: {
    resolveAlias: {
      canvas: './src/lib/canvas-mock.ts',
    }
  }
};

export default nextConfig;
