"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { pb } from "@/lib/pb";

/** Keeps the studio private: anyone without a valid PocketBase session goes to /login. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const client = pb();
    if (!client.authStore.isValid) {
      router.replace(`/login?next=${encodeURIComponent(path)}`);
      return;
    }
    client
      .collection("users")
      .authRefresh()
      .then(() => setReady(true))
      .catch(() => {
        client.authStore.clear();
        router.replace(`/login?next=${encodeURIComponent(path)}`);
      });
    // only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-soft" role="status">
        Opening your studio…
      </div>
    );
  return <>{children}</>;
}
