"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loading } from "@/components/admin/kit";

/** Support was split into Tickets and Feature requests; old links land on Tickets. */
export default function SupportPage() {
  const router = useRouter();
  useEffect(() => router.replace("/studio/admin/tickets"), [router]);
  return <Loading />;
}
