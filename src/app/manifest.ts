import type { MetadataRoute } from "next";

/** Lets browsers install the studio as an app on Windows, Mac, Linux, Chromebook, tablets and phones. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/studio",
    name: "Jollof Pages Studio",
    short_name: "Jollof Pages",
    description: "Write, format and publish print books and ebooks.",
    start_url: "/studio",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "any",
    background_color: "#f7ecdf",
    theme_color: "#ad3a17",
    categories: ["productivity", "books", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Your books", url: "/studio", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Writing progress", url: "/studio/progress", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
