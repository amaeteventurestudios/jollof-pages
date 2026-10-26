import Link from "next/link";

export function SiteFooter({ name, email }: { name: string; email?: string }) {
  return (
    <footer className="t-small grid gap-2 px-4 pt-[20svh] pb-8 text-soft sm:grid-cols-[1fr_auto_1fr] sm:items-baseline sm:gap-6 sm:px-8 sm:pt-[30svh]">
      <p>{name}, independent non-fiction</p>
      <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-1 text-ink">
        <Link href="/books" className="link">
          Books
        </Link>
        <Link href="/#reader-list" className="link">
          Reader list
        </Link>
        {email && (
          <a href={`mailto:${email}`} className="link">
            {email}
          </a>
        )}
        <Link href="/studio" className="link">
          Studio
        </Link>
      </nav>
      <p className="sm:text-right">© {new Date().getFullYear()} {name}</p>
    </footer>
  );
}
