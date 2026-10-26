import Link from "next/link";

export function SiteHeader({ name }: { name: string }) {
  return (
    <header className="flex items-center justify-between gap-6 py-6">
      <Link href="/" className="text-[1.375rem] font-semibold whitespace-nowrap tracking-[-0.02em]">
        {name}
      </Link>
      <nav aria-label="Site" className="t-small flex items-center gap-5 sm:gap-7">
        <Link href="/books" className="link">
          Books
        </Link>
        <Link href="/#studio" className="link">
          <span className="sm:hidden">Studio</span>
          <span className="hidden sm:inline">How we make them</span>
        </Link>
        <Link href="/#about" className="link">
          About
        </Link>
      </nav>
    </header>
  );
}
