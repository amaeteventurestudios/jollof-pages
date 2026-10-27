"use client";

import { useId, useState } from "react";
import { pb } from "@/lib/pb";
import { cn } from "@/lib/utils";

export function SubscribeForm({
  source = "website",
  tone = "light",
  button = "Join",
  done = "You are on the list. The next book will reach you first.",
}: {
  source?: string;
  tone?: "light" | "dark";
  button?: string;
  done?: string;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  if (state === "done") return <p className="mt-6 text-[1.125rem] font-semibold">{done}</p>;
  return (
    <form
      className="mt-6"
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
      <label htmlFor={id} className="t-small font-medium">
        Email address
      </label>
      <div className={cn("mt-2 flex flex-col gap-2 p-1.5 sm:flex-row", tone === "dark" ? "bg-cream" : "bg-white")}>
        <input
          id={id}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 min-w-0 flex-1 bg-transparent px-5 text-char placeholder:text-char/50 focus-visible:outline-offset-0"
        />
        <button type="submit" className={cn("btn shrink-0", tone !== "dark" && "btn-ink")} disabled={state === "busy"}>
          {state === "busy" ? "Joining…" : button}
        </button>
      </div>
      {state === "error" && <p className={cn("t-small mt-2 font-semibold", tone === "dark" ? "text-bonnet" : "text-jollof")}>That did not go through. Please try again.</p>}
    </form>
  );
}
