import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70svh] max-w-xl flex-col justify-center px-4">
      <h1 className="t-head">This page is not on the shelf</h1>
      <p className="mt-6">It may have moved, or the book is not published yet.</p>
      <Link href="/books" className="btn mt-10 w-fit">
        See all books
      </Link>
    </main>
  );
}
