import type { Metadata } from "next";
import { AuthGate } from "@/components/studio/auth-gate";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = { title: "Studio", robots: { index: false } };

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
    </AuthGate>
  );
}
