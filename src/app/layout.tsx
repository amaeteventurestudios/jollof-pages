import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { THEME_SCRIPT } from "@/lib/theme";

// variable weight plus the width axis, so display lines can be set extra wide
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });

export const metadata: Metadata = {
  title: { default: "Jollof Pages", template: "%s · Jollof Pages" },
  description: "Jollof Pages publishes practical non-fiction, written and made in its own studio.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
