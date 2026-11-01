import type { Metadata } from "next";
import { BrandStyle } from "@/components/brand";
import { AuthGate } from "@/components/studio/auth-gate";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TranslateProgress } from "@/components/studio/translate-progress";
import { AppMode } from "@/components/app/app-mode";
import { appViewport } from "@/components/app/app-layout";

export const viewport = appViewport;

export const metadata: Metadata = { title: "Desk", robots: { index: false } };

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppMode />
      <BrandStyle />
      <AuthGate>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <TranslateProgress />
      </AuthGate>
    </>
  );
}
