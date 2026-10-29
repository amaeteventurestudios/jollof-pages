import type { Viewport } from "next";
import { AppMode } from "./app-mode";

/** Lets the app draw under the notch and home bar; the app bars pad themselves with the safe areas. */
export const appViewport: Viewport = { viewportFit: "cover", themeColor: "#ad3a17" };

/** Layout for the account pages, which run as the app on phones and tablets. */
export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppMode />
      {children}
    </>
  );
}
