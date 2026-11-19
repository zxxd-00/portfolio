/**
 * The map sheet's neatline: a fixed double border around the viewport with
 * graticule ticks and corner coordinates, as on a printed quadrangle.
 */
const TICKS = [12.5, 25, 37.5, 50, 62.5, 75, 87.5];

export function Neatline() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50">
      <div className="absolute inset-[var(--frame)] border border-ink/80">
        <div className="absolute inset-[3px] border border-ink/25" />
        {TICKS.map((t) => (
          <span key={t}>
            <i className="absolute top-0 h-[7px] w-px bg-ink/60" style={{ left: `${t}%` }} />
            <i className="absolute bottom-0 h-[7px] w-px bg-ink/60" style={{ left: `${t}%` }} />
            <i className="absolute left-0 h-px w-[7px] bg-ink/60" style={{ top: `${t}%` }} />
            <i className="absolute right-0 h-px w-[7px] bg-ink/60" style={{ top: `${t}%` }} />
          </span>
        ))}
        <span className="meta absolute left-2 top-2 hidden bg-paper px-1 text-[10px] text-ink-soft md:block">37°52′30″</span>
        <span className="meta absolute right-2 top-2 hidden bg-paper px-1 text-[10px] text-ink-soft md:block">122°15′00″</span>
      </div>
    </div>
  );
}
