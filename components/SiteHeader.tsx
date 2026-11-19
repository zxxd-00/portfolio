import Link from "next/link";
import { NavLinks } from "./NavLinks";

export function SiteHeader() {
  return (
    <header className="relative z-40 border-b border-ink/15">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-3 sm:px-8">
        <Link href="/" className="font-display text-xl tracking-[0.06em] text-forest uppercase">
          Zaid Adassi
        </Link>
        <NavLinks />
      </nav>
    </header>
  );
}
