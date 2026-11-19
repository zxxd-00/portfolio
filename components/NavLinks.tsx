"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/resume", label: "Resume" },
  { href: "/contact", label: "Contact" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <ul className="flex items-center gap-5 sm:gap-7">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={active ? "page" : undefined}
              className="group relative inline-flex items-center gap-2 py-2 text-[0.95rem] text-ink transition-colors hover:text-forest"
            >
              <span
                aria-hidden
                className={`h-3 w-1.5 border border-ink/60 transition-colors ${active ? "border-blaze bg-blaze" : "bg-transparent group-hover:border-blaze"}`}
              />
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
