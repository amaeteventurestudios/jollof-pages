import type { Metadata } from "next";
import { unsubscribe } from "@/lib/server/unsubscribe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Unsubscribed", robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const name = await unsubscribe((await searchParams).t || "").catch(() => null);
  return (
    <main className="grid min-h-screen place-items-center bg-paper p-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl tracking-tight">{name ? "You are off the list" : "Link not recognised"}</h1>
        <p className="mt-4 text-lg text-soft">
          {name ? `You will not get any more newsletters from ${name}.` : "This unsubscribe link has expired or was copied incompletely. Reply to the newsletter and the author will take you off by hand."}
        </p>
      </div>
    </main>
  );
}
