"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Registers the service worker in production so the studio can be installed as an app. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}

/**
 * "Install app", shown only where the browser offers installation (Chrome and Edge on Windows,
 * Mac, Linux, Chromebook and Android). Safari users add it from the Share or File menu instead.
 */
/** The browser's install offer, or null where it isn't offered (or the app is already installed). */
export function useInstallPrompt(): (() => Promise<void>) | null {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  if (!prompt) return null;
  return async () => {
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  };
}

export function InstallButton({ className, label = "Install app" }: { className?: string; label?: string }) {
  const install = useInstallPrompt();
  if (!install) return null;
  return (
    <button type="button" className={cn("inline-flex items-center gap-2", className)} onClick={install}>
      <Download className="size-4" aria-hidden />
      {label}
    </button>
  );
}
