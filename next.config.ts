import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server in .next/standalone so the Cloud Run image
  // carries only the files the app actually needs.
  output: "standalone",
};

export default nextConfig;
