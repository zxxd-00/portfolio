import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact" };

const CHANNELS = [
  { name: "Email", value: "adassizaid@gmail.com", href: "mailto:adassizaid@gmail.com" },
  { name: "LinkedIn", value: "linkedin.com/in/zaid-adassi", href: "https://linkedin.com/in/zaid-adassi" },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8">
      <header className="pt-16 sm:pt-24">
        <h1 className="font-display text-[clamp(3rem,9vw,6.5rem)] text-forest">Contact</h1>
        <p className="mt-4 max-w-[52ch] text-lg">
          Thank you for stopping by. The best way to reach me is by email, and I&rsquo;m always happy to talk about a project or an opportunity.
        </p>
      </header>
      <ul className="mt-14 border-t-2 border-ink/80">
        {CHANNELS.map((c) => (
          <li key={c.name} className="border-b border-ink/15">
            <a
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="group grid gap-1 py-7 sm:grid-cols-[9rem_1fr] sm:items-baseline"
            >
              <span className="meta flex items-center gap-3 text-ink-soft">
                <span aria-hidden className="h-4 w-2.5 border-[1.5px] border-blaze transition-colors group-hover:border-ink group-hover:bg-blaze" />
                {c.name}
              </span>
              <span className="font-display break-all text-[clamp(1.9rem,5vw,3.4rem)] text-forest group-hover:text-ink">{c.value}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="meta mt-6 text-ink-soft">Base: Berkeley, California · 37.8719° N, 122.2585° W</p>
    </div>
  );
}
