"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** "Buy the ebook" from the author's own site: off to Stripe Checkout, back to a download link. */
export function BuyDirect({ bookId, price, dark }: { bookId: string; price: string; dark: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function buy() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/ebooks/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookId }) });
      const out = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !out.url) throw new Error(out.error || "That did not work. Try again.");
      window.location.assign(out.url);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }
  return (
    <li className="sm:col-span-2">
      <button
        type="button"
        onClick={buy}
        disabled={busy}
        data-track="Direct ebook"
        className={cn("buy-row flex h-16 w-full items-center justify-between gap-4 border-2 px-5 text-left font-semibold", dark ? "border-cream bg-cream text-char" : "border-char bg-char text-cream")}
      >
        <span>{busy ? "Opening checkout…" : "Buy the ebook here"}</span>
        <span className="flex items-center gap-3">
          <span className="tabular">{price}</span>
          <ArrowRight className="arrow size-5" aria-hidden />
        </span>
      </button>
      <p className="mt-1.5 text-sm opacity-80" role="status">
        {msg || "EPUB download straight after paying. Reads on Apple Books, Kobo, Google Play and most apps."}
      </p>
    </li>
  );
}
