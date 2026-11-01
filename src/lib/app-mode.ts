/**
 * "App mode": phones and tablets get the Desk as a native-feeling app (bottom tabs, app bars,
 * sheets) while desktops keep the full Desk. Keep APP_QUERY in step with the `app` variant in
 * globals.css, which applies only while <html> carries APP_CLASS.
 */
export const APP_QUERY = "(max-width: 1023.98px), (pointer: coarse) and (max-width: 1366px)";
export const APP_CLASS = "studio-app";

/** The pages that run as the app: the Desk and the account pages in front of it. */
export const APP_PATHS = "^/(desk|login|signup|invite)(/|$)";

/** Marks <html> before the first paint on a full page load; AppMode keeps it right after that. */
export const APP_SCRIPT = `try{if(new RegExp("${APP_PATHS}").test(location.pathname))document.documentElement.classList.add("${APP_CLASS}")}catch(e){}`;

/** Opened from the home screen (or as an installed desktop app), not in a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
