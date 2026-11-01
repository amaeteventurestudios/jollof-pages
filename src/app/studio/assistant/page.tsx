"use client";

import { useEffect, useState } from "react";
import { StudioNav } from "@/components/studio/studio-nav";
import { MemoryView, SettingsView, api } from "@/components/studio/book/assistant-panel";
import { errorMessage } from "@/lib/pb";
import type { AssistantSetup } from "@/lib/assistant";

/** The writing assistant's settings and memory, outside any one book. */
export default function AssistantPage() {
  const [setup, setSetup] = useState<AssistantSetup | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<AssistantSetup>("/api/assistant/settings")
      .then(setSetup)
      .catch((e) => setError(errorMessage(e)));
  }, []);
  const ready = !!setup?.provider && !!setup.keys[setup.provider];
  return (
    <>
      <StudioNav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
        <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] leading-tight tracking-[-0.02em]">AI assistant</h1>
        <p className="mt-1 max-w-2xl text-soft">
          Choose Claude, ChatGPT or OpenRouter and add your own key. The assistant then helps in the Write tab, and suggests titles, descriptions, keywords and cover ideas across your books. It is
          optional: if you would rather write without AI, leave this empty and nothing is ever sent to an AI.
        </p>
        {error && <p className="mt-6 text-destructive">{error}</p>}
        {!setup && !error && (
          <p className="mt-6 text-soft" role="status">
            Loading…
          </p>
        )}
        {setup && (
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section aria-labelledby="ai-setup" className="text-sm">
              <h2 id="ai-setup" className="mb-4 text-lg">
                Model and key
              </h2>
              <SettingsView setup={setup} onSetup={setSetup} />
            </section>
            <section aria-labelledby="ai-memory" className="text-sm">
              <h2 id="ai-memory" className="mb-4 text-lg">
                What it remembers
              </h2>
              {ready ? <MemoryView memoryOn={setup.memory} /> : <p className="text-soft">Set up a model first.</p>}
            </section>
          </div>
        )}
      </main>
    </>
  );
}
