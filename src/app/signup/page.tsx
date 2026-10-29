import type { Metadata } from "next";
import Link from "next/link";
import { signupMode } from "@/lib/server/accounts";
import { studioPriceCents } from "@/lib/server/stripe";
import { rootDomain } from "@/lib/sites";
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Start writing", description: "Create your Jollof Pages studio and your own author website." };

export default function SignupPage() {
  const mode = signupMode();
  const price = `$${(studioPriceCents() / 100).toFixed(studioPriceCents() % 100 ? 2 : 0)}`;
  return (
    <AuthShell
      title="Your studio and"
      accent="your author website."
      lead={`Write, format and export print books and ebooks. Your own site at yourname.${rootDomain()} fills itself in from the studio.`}
      points={[mode === "paid" ? `${price} once. No subscription.` : mode === "free" ? "Free during early access" : "Early access", "Print and ebook files", "Connect your own domain"]}
    >
      <div className="auth-card p-6 sm:p-9">
        {mode === "closed" ? (
          <>
            <AuthHeading title="Sign-up opens soon" />
            <div className="grid gap-4 text-lg">
              <p>New accounts are not open yet. Join the early-access list and we will email you the day your seat is ready.</p>
              <Link href="/#early-access" className="auth-go">
                Join early access
              </Link>
            </div>
          </>
        ) : (
          <SignupForm root={rootDomain()} paid={mode === "paid"} price={price} />
        )}
        <p className="auth-rise d5 mt-7 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
