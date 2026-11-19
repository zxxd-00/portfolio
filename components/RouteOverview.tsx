import Link from "next/link";

export type RouteStop = { slug: string; wpt: string; title: string; dates: string; org: string };

/**
 * The whole trail at a glance: every project as a waypoint on one dashed route,
 * each linking down to its entry on the trail below.
 */
export function RouteOverview({ stops }: { stops: RouteStop[] }) {
  return (
    <nav aria-label="All projects" className="mt-12 border-y border-ink/20 py-8">
      <p className="meta text-ink-soft">Route overview · {stops.length} waypoints</p>
      <ol
        className="relative mt-6 grid gap-6 lg:[grid-template-columns:repeat(var(--stops),minmax(0,1fr))] lg:gap-4"
        style={{ "--stops": stops.length } as React.CSSProperties}
      >
        {/* The route: vertical on phones, horizontal from md up, passing through every marker. */}
        <span aria-hidden className="absolute top-2 bottom-14 left-[6px] border-l-2 border-dashed border-blaze lg:hidden" />
        <span aria-hidden className="absolute top-[11px] right-[8%] left-[6px] hidden border-t-2 border-dashed border-blaze lg:block" />
        {stops.map((s) => (
          <li key={s.slug} className="relative">
            <Link href={`#${s.slug}`} className="group flex gap-4 lg:block">
              <span
                aria-hidden
                className="relative z-10 mt-0.5 block h-6 w-3.5 shrink-0 border-[1.5px] border-ink bg-blaze transition-colors group-hover:bg-forest lg:mt-0"
              />
              <span className="block lg:mt-4">
                <span className="meta block text-ink-soft">WPT {s.wpt}</span>
                <span className="meta block whitespace-nowrap text-ink-soft">{s.dates}</span>
                <span className="font-display mt-1 block text-2xl text-forest lg:text-xl group-hover:text-ink">{s.title}</span>
                <span className="mt-1 block text-[0.9rem] leading-snug text-ink-soft">{s.org}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
