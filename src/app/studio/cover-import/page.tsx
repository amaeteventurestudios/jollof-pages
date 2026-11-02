"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CoverImport } from "@/components/studio/cover-import";

function Inner() {
  const book = useSearchParams().get("book") ?? "";
  return <CoverImport bookParam={/^[a-z0-9]{1,30}$/.test(book) ? book : undefined} />;
}

/** Covers sent from Jollof Studio land here ("Send to Jollof Pages"). */
export default function CoverImportPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
