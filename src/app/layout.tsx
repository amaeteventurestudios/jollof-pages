import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/lib/toast";

export const metadata: Metadata = {
  title: {
    default: "Jollof Pages | Continuity Workflow for Graphic Novel Creation",
    template: "%s | Jollof Pages",
  },
  description:
    "Jollof Pages helps graphic novel creators keep canon, revisions, scenes, pages, and panels connected so serialized stories stay coherent from outline to art handoff.",
  openGraph: {
    siteName: "Jollof Pages",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
