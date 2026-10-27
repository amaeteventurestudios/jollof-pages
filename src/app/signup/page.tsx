import type { Metadata } from "next";
import Link from "next/link";
import { signupMode } from "@/lib/server/accounts";
import { studioPriceCents } from "@/lib/server/stripe";
import { rootDomain } from "@/lib/sites";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Start writing", description: "Create your Jollof Pages studio and your own author website." };

export default function SignupPage() {
  const mode = signupMode();
  const price = `$${(studioPriceCents() / 100).toFixed(studioPriceCents() % 100 ? 2 : 0)}`;
  return (
    <main className="grid min-h-screen bg-paper md:grid-cols-2">
      <section className="flex flex-col justify-between bg-[#2b2622] p-8 text-[#ebe5e3] md:p-12">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Jollof Pages
        </Link>
        <div className="max-w-md py-16">
          <p className="text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] tracking-[-0.02em]">Your studio and your author website.</p>
          <ul className="mt-8 grid gap-3 text-lg text-[#ebe5e3]/85">
            <li>Write, format and export print books and ebooks.</li>
            <li>
              Your own site at <span className="font-semibold text-[#ebe5e3]">yourname.{rootDomain()}</span>, filled in from the studio: every book, its own page, a free sample and a reader list.
            </li>
            <li>Connect a domain you own whenever you like.</li>
          </ul>
        </div>
        <p className="text-sm text-[#ebe5e3]/70">{mode === "paid" ? `${price} once. No subscription.` : mode === "free" ? "Free while we are in early access." : " "}</p>
      </section>
      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="mb-8 text-3xl tracking-tight">{mode === "closed" ? "Sign-up opens soon" : "Create your studio"}</h1>
          {mode === "closed" ? (
            <div className="grid gap-4 text-lg">
              <p>New accounts are not open yet. Join the early-access list and we will email you the day your seat is ready.</p>
              <Link href="/#early-access" className="font-medium text-primary underline underline-offset-4">
                Join early access
              </Link>
            </div>
          ) : (
            <SignupForm root={rootDomain()} paid={mode === "paid"} price={price} />
          )}
          <p className="mt-8 text-sm text-soft">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
