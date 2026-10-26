import Link from "next/link";
import { Pattern } from "@/components/site/patterns";

export default function NotFound() {
  return (
    <main className="relative flex min-h-svh items-center overflow-hidden bg-jollof px-4 text-cream">
      <Pattern id="p-404" kind="adire" color="var(--char)" opacity={0.22} />
      <div className="relative mx-auto max-w-2xl">
        <h1 className="t-head wide font-bold">Not on the shelf</h1>
        <p className="t-lead mt-6">This page may have moved, or the book is not published yet.</p>
        <Link href="/books" className="btn mt-10">
          See all books
        </Link>
      </div>
    </main>
  );
}
