import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Typst/EPUBCheck export routes shell out to local binaries, so the server bundle
  // must keep node built-ins; standalone output keeps the Docker image small.
  output: "standalone",
  // the assistant's memory loads native modules (SQLite, ONNX) at run time, so they stay out of the bundle
  serverExternalPackages: ["mem0ai", "better-sqlite3", "fastembed", "onnxruntime-node", "@anthropic-ai/sdk"],
  // ONNX's binding loads this library at run time, out of sight of file tracing
  outputFileTracingIncludes: {
    "/api/assistant/*": ["./node_modules/onnxruntime-node/bin/napi-v3/linux/*/libonnxruntime.so*"],
  },
  // the usual guesses for the Desk sign-in all land on it
  async redirects() {
    return [
      ...["/signin", "/sign-in", "/admin", "/dashboard", "/author", "/write"].map((source) => ({ source, destination: "/login", permanent: false })),
      ...["/sign-up", "/register", "/start"].map((source) => ({ source, destination: "/signup", permanent: false })),
    ];
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
