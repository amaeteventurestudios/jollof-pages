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
    // shown on Android's install sheet, which then looks like a store listing
    screenshots: [
      { src: "/app/screens/phone-books.png", sizes: "786x1318", type: "image/png", form_factor: "narrow", label: "Your books" },
      { src: "/app/screens/phone-write.png", sizes: "786x1318", type: "image/png", form_factor: "narrow", label: "Write chapter by chapter" },
      { src: "/app/screens/phone-preview.png", sizes: "786x1318", type: "image/png", form_factor: "narrow", label: "See the printed page as you write" },
      { src: "/app/screens/desktop-books.png", sizes: "1440x900", type: "image/png", form_factor: "wide", label: "The studio on a computer" },
    ],
    shortcuts: [
      { name: "Your books", url: "/studio", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Writing progress", url: "/studio/progress", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
