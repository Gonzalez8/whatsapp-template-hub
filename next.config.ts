import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The Docker image runs the self-contained server in
  // .next/standalone. Vercel builds without it, as always.
  ...(process.env.NEXT_OUTPUT === "standalone" && { output: "standalone" }),
};

export default nextConfig;
