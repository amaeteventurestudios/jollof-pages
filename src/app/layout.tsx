import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { THEME_SCRIPT } from "@/lib/theme";
import { APP_SCRIPT } from "@/lib/app-mode";
import { RegisterServiceWorker } from "@/components/pwa";

// variable weight plus the width axis, so display lines can be set extra wide
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });

const TITLE = "Jollof Pages: write, format and publish your book";
const DESCRIPTION =
  "The book studio for authors. Write your manuscript, format a KDP-ready paperback, hardcover and ebook, design the cover, and publish to your own author website. An Atticus and Vellum alternative for $129 once, no subscription.";
const OG_IMAGE = { url: "/og/jollof-pages.jpg", width: 1200, height: 630, alt: "Jollof Pages: Write. Format. Publish. Your book, from first draft to finished page." };

export const metadata: Metadata = {
  title: { default: TITLE, template: "%s · Jollof Pages" },
  description: DESCRIPTION,
  // SITE_URL is only known at run time, so the public address is the fallback rather than localhost
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://jollofpages.com"),
  keywords: [
    "Atticus alternative",
    "Vellum alternative",
    "Vellum for Windows",
    "book formatting software",
    "KDP formatting",
    "self-publishing software",
    "book writing software",
    "format a book for Amazon KDP",
    "ebook formatter",
    "EPUB maker",
    "paperback cover creator",
    "author website builder",
  ],
  authors: [{ name: "Amaete Venture Studios" }],
  creator: "Amaete Venture Studios",
  publisher: "Amaete Venture Studios",
  category: "books",
  openGraph: { type: "website", siteName: "Jollof Pages", title: TITLE, description: DESCRIPTION, locale: "en_US", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [OG_IMAGE] },
  applicationName: "Jollof Pages",
  appleWebApp: { capable: true, title: "Jollof Pages", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#ad3a17" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT + APP_SCRIPT }} />
      </head>
      <body className="min-h-full">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
