import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { THEME_SCRIPT } from "@/lib/theme";
import { RegisterServiceWorker } from "@/components/pwa";

// variable weight plus the width axis, so display lines can be set extra wide
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });

export const metadata: Metadata = {
  title: { default: "Jollof Pages", template: "%s · Jollof Pages" },
  description: "Jollof Pages is the book studio for authors: write, format and publish print books and ebooks ready for Amazon KDP.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  applicationName: "Jollof Pages",
  appleWebApp: { capable: true, title: "Jollof Pages", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#ad3a17" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
