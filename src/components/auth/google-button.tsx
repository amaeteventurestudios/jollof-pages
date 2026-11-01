"use client";

import { useEffect, useState } from "react";
import { pb, errorMessage } from "@/lib/pb";

/**
 * "Continue with Google" through PocketBase's OAuth2 popup. Shows nothing until PocketBase says the
 * Google provider is switched on, so the page never offers a button that cannot work.
 */
export function GoogleButton({ label = "Continue with Google", onSignedIn, onError }: { label?: string; onSignedIn: () => void | Promise<void>; onError: (msg: string) => void }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pb()
      .collection("users")
      .listAuthMethods()
      .then((m) => setEnabled(Boolean(m.oauth2?.enabled && m.oauth2.providers.some((p) => p.name === "google"))))
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled) return null;
  return (
    <>
      <button
        type="button"
        className="auth-google auth-rise d2"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          onError("");
          try {
            await pb().collection("users").authWithOAuth2({ provider: "google" });
            await onSignedIn();
          } catch (err) {
            const msg = errorMessage(err);
            // closing the popup is not an error worth showing
            if (!/cancel|closed|abort/i.test(msg)) onError(`Google sign-in did not finish: ${msg}`);
            setBusy(false);
          }
        }}
      >
        <GoogleMark />
        {busy ? "Waiting for Google…" : label}
      </button>
      <p className="auth-or auth-rise d2 my-6">or with email</p>
    </>
  );
}

/** True when a Google account was just made here and still needs its author name and website. */
export async function needsSite(): Promise<boolean> {
  const client = pb();
  const me = client.authStore.record;
  if (!me || me.access !== "pending") return false;
  const sites = await client
    .collection("site_settings")
    .getList(1, 1, { filter: client.filter("owner = {:id}", { id: me.id }) })
    .catch(() => ({ totalItems: 1 }));
  return sites.totalItems === 0;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
