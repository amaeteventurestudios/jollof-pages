"use client";
import dynamic from "next/dynamic";
import { MOCK_BOOKS } from "@/lib/mock/jollof-data";

// The editor draws on <canvas> and reads the browser's storage, so it only runs in the browser.
const CoverDesigner = dynamic(() => import("@/components/cover/CoverDesigner"), {
  ssr: false,
  loading: () => <div className="flex h-dvh items-center justify-center bg-jollof-black text-sm text-jollof-subtext">Opening the cover designer…</div>,
});

export default function BookCoverPage() {
  const book = MOCK_BOOKS[0];
  return <CoverDesigner bookId={book.id} bookTitle={book.title.replace(/^Book \d+:\s*/, "")} seriesTitle="Equanauts" backHref="/books/book-01" />;
}
