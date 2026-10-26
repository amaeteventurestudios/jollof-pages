"use client";

import { useState } from "react";
import { pb } from "@/lib/pb";

export function SubscribeForm({ source = "website" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  if (state === "done") return <p className="mt-4 text-ink">You are on the list. The next book will reach you first.</p>;
  return (
    <form
      className="mt-5 grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        try {
          await pb().collection("subscribers").create({ email, source });
          setState("done");
        } catch (err) {
          // already subscribed is still a success for the reader
          const status = (err as { status?: number }).status;
          setState(status === 400 ? "done" : "error");
        }
      }}
    >
      <label htmlFor="sub-email" className="t-small">
        Email address
      </label>
      <input id="sub-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-13 bg-paper px-4 text-ink" />
      <button type="submit" className="btn w-full" disabled={state === "busy"}>
        {state === "busy" ? "Joining…" : "Join the reader list"}
      </button>
      {state === "error" && <p className="t-small text-destructive">That did not go through. Please try again.</p>}
    </form>
  );
}
