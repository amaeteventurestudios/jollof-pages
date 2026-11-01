import type { Metadata } from "next";
import { AuthGate } from "@/components/studio/auth-gate";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppMode } from "@/components/app/app-mode";
import { appViewport } from "@/components/app/app-layout";

export const viewport = appViewport;

export const metadata: Metadata = { title: "Studio", robots: { index: false } };

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppMode />
      <AuthGate>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </AuthGate>
    </>
  );
}
