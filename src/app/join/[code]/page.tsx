import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** A tester invite link from the owner's admin: jollofpages.com/join/<code> opens the sign-up form for it. */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/signup?invite=${encodeURIComponent(code)}`);
}
