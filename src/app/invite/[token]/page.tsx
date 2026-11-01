"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileDiff, MessageSquare, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage, pb } from "@/lib/pb";
import { ROLE_INFO } from "@/lib/collab";

interface InviteInfo {
  email: string;
  name: string;
  role: "cowriter" | "editor" | "commenter";
  status: string;
  bookId: string;
  bookTitle: string;
  from: string;
  message: string;
  hasAccount: boolean;
}

const ICONS = { cowriter: PenLine, editor: FileDiff, commenter: MessageSquare };
const YOU_CAN = {
  cowriter: "Write and edit the chapters together, live. You see each other's cursors as you type.",
  editor: "Edit the chapters. Your changes show as suggestions the author accepts or rejects.",
  commenter: "Read the chapters and leave comments on any passage.",
};

/** Where an invitation link lands: say who asked and for what, then join with an account or a new free one. */
export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const client = pb();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (client.authStore.isValid) setSignedIn(String(client.authStore.record?.email ?? ""));
    fetch(`/api/collab/invite?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const body = (await r.json()) as InviteInfo & { error?: string };
        if (!r.ok) throw new Error(body.error || "This invitation could not be opened.");
        setInfo(body);
        setName(body.name);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [token]);

  const next = `/invite/${token}`;
  const login = info ? `/login?next=${encodeURIComponent(next)}&email=${encodeURIComponent(info.email)}` : "/login";

  async function accept(withAccount: boolean) {
    if (!info) return;
    setBusy(true);
    setError("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (withAccount) headers.Authorization = pb().authStore.token;
      const res = await fetch("/api/collab/accept", { method: "POST", headers, body: JSON.stringify(withAccount ? { token } : { token, name, password }) });
      const body = (await res.json()) as { ok?: boolean; bookId?: string; error?: string; needLogin?: boolean };
      if (body.needLogin) {
        router.push(login);
        return;
      }
      if (!res.ok || !body.bookId) throw new Error(body.error || "Could not accept the invitation.");
      if (!withAccount) await pb().collection("users").authWithPassword(info.email, password);
      router.replace(`/desk/books/${body.bookId}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  const role = info ? ROLE_INFO[info.role] : null;
  const Icon = info ? ICONS[info.role] : PenLine;

  return (
    <main className="grid min-h-screen bg-paper md:grid-cols-2">
      <section className="flex flex-col justify-between bg-[#2b2622] p-8 text-[#ebe5e3] md:p-12">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Jollof Pages
        </Link>
        <div className="max-w-md py-16">
          {info ? (
            <>
              <p className="text-sm tracking-[0.12em] text-[#ebe5e3]/70 uppercase">An invitation from {info.from}</p>
              <p className="mt-4 text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] tracking-[-0.02em]">{info.bookTitle}</p>
              {info.message && <blockquote className="mt-6 border-l-2 border-primary pl-4 text-lg whitespace-pre-wrap text-[#ebe5e3]/85 italic">{info.message}</blockquote>}
            </>
          ) : (
            <p className="text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] tracking-[-0.02em]">Write it together.</p>
          )}
        </div>
        <p className="text-sm text-[#ebe5e3]/70">Joining is free. You only see the books you are invited to.</p>
      </section>

      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {!info && !error && (
            <p role="status" className="text-soft">
              Opening the invitation…
            </p>
          )}
          {!info && error && (
            <>
              <h1 className="text-3xl tracking-tight">Invitation not found</h1>
              <p className="mt-4 text-soft">{error}</p>
              <p className="mt-2 text-soft">Ask the author to send you a new link.</p>
            </>
          )}
          {info && role && (
            <>
              <div className="flex items-start gap-3 border border-border bg-card p-4">
                <span className="grid size-10 shrink-0 place-items-center bg-primary-soft text-primary">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-medium">You are invited as {role.label.toLowerCase()}</span>
                  <span className="mt-0.5 block text-sm text-soft">{YOU_CAN[info.role]}</span>
                </span>
              </div>

              {signedIn ? (
                <div className="mt-8 grid gap-4">
                  <p className="text-sm text-soft">
                    Signed in as <strong className="text-ink">{signedIn}</strong>.
                    {signedIn.toLowerCase() !== info.email && ` The invitation went to ${info.email}; it will join the account you are signed in with.`}
                  </p>
                  <Button size="lg" disabled={busy} onClick={() => accept(true)}>
                    {busy ? "Joining…" : "Accept and open the book"}
                  </Button>
                  <button
                    type="button"
                    className="text-sm text-soft underline underline-offset-4"
                    onClick={() => {
                      pb().authStore.clear();
                      setSignedIn(null);
                    }}
                  >
                    Use a different account
                  </button>
                </div>
              ) : info.hasAccount || info.status === "accepted" ? (
                <div className="mt-8 grid gap-4">
                  <p className="text-soft">
                    There is already an account for <strong className="text-ink">{info.email}</strong>. Sign in to accept.
                  </p>
                  <Button size="lg" onClick={() => router.push(login)}>
                    Sign in to accept
                  </Button>
                </div>
              ) : (
                <form
                  className="mt-8 grid gap-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    accept(false);
                  }}
                >
                  <h1 className="text-2xl tracking-tight">Create your free account</h1>
                  <div className="grid gap-1.5">
                    <Label htmlFor="inv-email">Email</Label>
                    <Input id="inv-email" value={info.email} readOnly className="h-11 bg-paper-2 text-base" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="inv-name">Your name</Label>
                    <Input id="inv-name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-base" />
                    <span className="text-[13px] text-soft">Shown next to your comments and changes.</span>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="inv-pass">Password</Label>
                    <Input
                      id="inv-pass"
                      type="password"
                      autoComplete="new-password"
                      minLength={10}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 text-base"
                    />
                    <span className="text-[13px] text-soft">At least 10 characters.</span>
                  </div>
                  <Button type="submit" size="lg" disabled={busy}>
                    {busy ? "Joining…" : "Join and open the book"}
                  </Button>
                  <p className="text-center text-sm text-soft">
                    Have an account under another address?{" "}
                    <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-primary underline underline-offset-4">
                      Sign in
                    </Link>
                  </p>
                </form>
              )}
              {error && (
                <p role="alert" className="mt-4 text-sm text-destructive">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
