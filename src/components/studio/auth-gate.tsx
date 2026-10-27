"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { pb } from "@/lib/pb";
import { Button } from "@/components/ui/button";

/**
 * Keeps the studio private: anyone without a valid PocketBase session goes to /login, and an
 * account that has not paid yet sees the checkout step instead of the studio.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [state, setState] = useState<"loading" | "ready" | "unpaid">("loading");

  useEffect(() => {
    const client = pb();
    if (!client.authStore.isValid) {
      router.replace(`/login?next=${encodeURIComponent(path)}`);
      return;
    }
    (async () => {
      try {
        // back from Stripe: open the studio without waiting for the webhook
        const params = new URLSearchParams(window.location.search);
        const session = params.get("session_id");
        if (params.get("studio") === "paid" && session) {
          await fetch("/api/accounts/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: client.authStore.token },
            body: JSON.stringify({ sessionId: session }),
          }).catch(() => undefined);
          window.history.replaceState(null, "", window.location.pathname);
        }
        const auth = await client.collection("users").authRefresh();
        setState(auth.record.access === "pending" ? "unpaid" : "ready");
      } catch {
        client.authStore.clear();
        router.replace(`/login?next=${encodeURIComponent(path)}`);
      }
    })();
    // only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "unpaid") return <FinishPurchase />;
  if (state !== "ready")
    return (
      <div className="grid min-h-screen place-items-center text-sm text-soft" role="status">
        Opening your studio…
      </div>
    );
  return <>{children}</>;
}

/** The account exists but the one-time payment has not come through. */
function FinishPurchase() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const email = String(pb().authStore.record?.email ?? "");
  return (
    <main className="grid min-h-screen place-items-center bg-paper p-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl tracking-tight">One step left</h1>
        <p className="mt-4 text-lg text-soft">
          Your account {email && <strong className="text-ink">{email}</strong>} is ready. Pay once to open your studio and put your author site online. There is nothing more to pay after this.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            size="lg"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const res = await fetch("/api/accounts/checkout", { method: "POST", headers: { Authorization: pb().authStore.token } });
                const body = (await res.json()) as { url?: string; error?: string };
                if (!res.ok || !body.url) throw new Error(body.error || "Could not start the payment.");
                window.location.assign(body.url);
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
                setBusy(false);
              }
            }}
          >
            {busy ? "Opening checkout…" : "Pay and open my studio"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              pb().authStore.clear();
              router.replace("/login");
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </main>
  );
}
