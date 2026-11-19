"use client";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type Waypoint = {
  slug: string;
  wpt: string;
  elevation: string;
  title: string;
  org: string;
  dates: string;
  role: string;
  summary: string;
  coords: string;
  cover?: string;
};

type Pt = { x: number; y: number; bottom: number };

/**
 * The trail drops straight down beside each entry (in its left gutter, clear of
 * the text), then switchbacks across the open ground to the next marker.
 */
function trailPath(points: Pt[], height: number) {
  if (!points.length) return "";
  let d = `M${points[0].x} 0 L${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    const leave = a.bottom + 16;
    d += ` L${a.x} ${leave}`;
    if (!b) {
      d += ` L${a.x} ${height}`;
      break;
    }
    const arrive = b.y - 28;
    const dy = (arrive - leave) * 0.6;
    d += ` C${a.x} ${leave + dy} ${b.x} ${arrive - dy} ${b.x} ${arrive} L${b.x} ${b.y}`;
  }
  return d;
}

export function TrailMap({ waypoints }: { waypoints: Waypoint[] }) {
  const root = useRef<HTMLOListElement>(null);
  const markers = useRef<(HTMLSpanElement | null)[]>([]);
  const reveal = useRef<SVGPathElement>(null);
  const [geo, setGeo] = useState({ w: 0, h: 0, d: "" });
  const [reached, setReached] = useState(-1);
  const marks = useRef<number[]>([]);

  const measure = useCallback(() => {
    const el = root.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const pts = markers.current.map((m) => {
      const r = m!.getBoundingClientRect();
      const li = m!.parentElement!.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, bottom: li.bottom - box.top };
    });
    marks.current = pts.map((p) => p.y);
    setGeo({ w: box.width, h: box.height, d: trailPath(pts, box.height) });
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (root.current) ro.observe(root.current);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = root.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      const line = window.innerHeight * 0.62;
      const y = Math.min(Math.max(line - box.top, 0), box.height);
      reveal.current?.style.setProperty("stroke-dashoffset", String(1 - y / Math.max(box.height, 1)));
      let r = -1;
      marks.current.forEach((m, i) => { if (m <= y) r = i; });
      setReached(r);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [geo]);

  return (
    <div className="relative">
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-visible"
        width={geo.w}
        height={geo.h}
        viewBox={`0 0 ${geo.w || 1} ${geo.h || 1}`}
      >
        <defs>
          <mask id="trail-mask" maskUnits="userSpaceOnUse" x={-20} y={-20} width={geo.w + 40} height={geo.h + 40}>
            <path
              ref={reveal}
              d={geo.d}
              fill="none"
              stroke="#fff"
              strokeWidth={10}
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1}
              style={{ transition: "stroke-dashoffset 120ms linear" }}
            />
          </mask>
        </defs>
        {/* Unwalked trail: faint dotted survey line. */}
        <path d={geo.d} fill="none" stroke="var(--contour-soft)" strokeWidth={1.2} strokeDasharray="1.5 6" strokeLinecap="round" />
        {/* Walked trail: blaze dashes revealed by scroll. */}
        <path d={geo.d} fill="none" stroke="var(--blaze)" strokeWidth={2.4} strokeDasharray="9 7" mask="url(#trail-mask)" />
      </svg>

      <ol ref={root} className="relative space-y-28 pt-16 pb-24 sm:space-y-36">
        {waypoints.map((w, i) => {
          const right = i % 2 === 1;
          const isReached = i <= reached;
          return (
            <li key={w.slug} id={w.slug} className={`relative scroll-mt-24 pl-12 md:w-[52%] md:pl-16 ${right ? "md:ml-[44%]" : "md:ml-[4%]"}`}>
              <span
                ref={(el) => { markers.current[i] = el; }}
                aria-hidden
                className={`absolute top-0.5 left-0 h-6 w-3.5 border-[1.5px] transition-colors duration-500 ${
                  isReached ? "border-ink bg-blaze" : "border-blaze bg-paper"
                }`}
              />
              <p className="meta text-ink-soft">
                WPT {w.wpt} · EL. {w.elevation} FT · {w.title.toUpperCase()}
              </p>
              <h2 className="font-display mt-3 text-[clamp(2.25rem,5vw,3.6rem)] text-forest">
                <Link href={`/projects/${w.slug}`} className="hover:text-ink">
                  {w.title}
                </Link>
              </h2>
              <p className="mt-2 text-ink-soft">
                {w.org} · {w.dates} · {w.role}
              </p>
              <p className="mt-4 max-w-[58ch]">{w.summary}</p>
              {w.cover && (
                // Fixed frame, whole image shown and centered: portrait and landscape covers are never cropped.
                <div className="mt-6 flex aspect-[16/10] w-full max-w-lg items-center justify-center border border-ink/20 bg-paper-deep/40 p-2">
                  <img src={w.cover} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                </div>
              )}
              <p className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                <Link href={`/projects/${w.slug}`} className="link font-medium text-forest">
                  Learn More
                </Link>
                {w.coords !== "—" && <span className="meta text-ink-soft">{w.coords}</span>}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
