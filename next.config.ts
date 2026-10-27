import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Typst/EPUBCheck export routes shell out to local binaries, so the server bundle
  // must keep node built-ins; standalone output keeps the Docker image small.
  output: "standalone",
  // the usual guesses for the studio sign-in all land on it
  async redirects() {
    return ["/signin", "/sign-in", "/admin", "/dashboard", "/author", "/write"].map((source) => ({ source, destination: "/login", permanent: false }));
  },
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
