import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Typst/EPUBCheck export routes shell out to local binaries, so the server bundle
  // must keep node built-ins; standalone output keeps the Docker image small.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
