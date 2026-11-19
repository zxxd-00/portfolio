"use client";
import { useEffect, useMemo, useState } from "react";

export type ProfileCamp = { id: string; name: string; label: string; elevation: number };

const W = 240;
const H = 96;
const PAD_X = 8;
const PAD_TOP = 14;
const PAD_BOTTOM = 10;

/** Deterministic terrain between camps so the profile reads as ground, not a chart line. */
function terrain(camps: ProfileCamp[]) {
  const lo = camps[0].elevation;
  const hi = camps[camps.length - 1].elevation;
  const sx = (t: number) => PAD_X + t * (W - PAD_X * 2);
  const sy = (e: number) => PAD_TOP + (1 - (e - lo) / (hi - lo || 1)) * (H - PAD_TOP - PAD_BOTTOM);
  const n = camps.length - 1;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = camps[i].elevation, b = camps[i + 1].elevation;
    for (let k = 0; k < 8; k++) {
      const f = k / 8;
      const wobble = k === 0 ? 0 : Math.sin((i * 8 + k) * 1.7) * 0.12 * (b - a) + Math.sin((i + k) * 3.1) * 14;
      pts.push([sx((i + f) / n), sy(a + (b - a) * f + wobble)]);
    }
  }
  pts.push([sx(1), sy(hi)]);
  const campPts = camps.map((c, i) => [sx(i / n), sy(c.elevation)] as [number, number]);
  return { pts, campPts };
}

function yAt(pts: [number, number][], x: number) {
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][0] >= x) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      return y0 + ((x - x0) / (x1 - x0 || 1)) * (y1 - y0);
    }
  }
  return pts[pts.length - 1][1];
}

/** Scroll position mapped onto the ascent: 0 at base camp, camps.length-1 at the summit. */
function useAscent(ids: string[]) {
  const [pos, setPos] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.4;
      const tops = ids.map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? Infinity);
      let p = 0;
      for (let i = 0; i < tops.length; i++) {
        if (tops[i] <= line) {
          const next = tops[i + 1];
          const frac = next === undefined ? 0 : Math.min(1, (line - tops[i]) / Math.max(next - tops[i], 1));
          p = i + frac;
        }
      }
      // Arrive at the summit once the last section is in view.
      const last = document.getElementById(ids[ids.length - 1])?.getBoundingClientRect();
      if (last && last.top < window.innerHeight * 0.75) p = Math.max(p, ids.length - 1);
      setPos(p);
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
  }, [ids]);
  return pos;
}

function Profile({ camps, pos, compact = false }: { camps: ProfileCamp[]; pos: number; compact?: boolean }) {
  const { pts, campPts } = useMemo(() => terrain(camps), [camps]);
  const n = camps.length - 1;
  const x = PAD_X + (Math.min(pos, n) / n) * (W - PAD_X * 2);
  const y = yAt(pts, x);
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join("");
  const area = `${line}L${W - PAD_X} ${H}L${PAD_X} ${H}Z`;
  const clipId = compact ? "walked-c" : "walked";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full overflow-visible" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={-20} width={x} height={H + 40} />
        </clipPath>
      </defs>
      <path d={area} fill="var(--contour)" fillOpacity={0.08} />
      <path d={line} fill="none" stroke="var(--contour-soft)" strokeWidth={1} strokeDasharray="2 3" />
      <path d={line} fill="none" stroke="var(--forest)" strokeWidth={1.6} clipPath={`url(#${clipId})`} />
      {campPts.map(([cx, cy], i) => (
        <g key={i}>
          <line x1={cx} x2={cx} y1={cy} y2={H} stroke="var(--contour)" strokeOpacity={0.35} strokeWidth={0.75} />
          <circle cx={cx} cy={cy} r={2.4} fill={i <= Math.floor(pos + 0.001) ? "var(--forest)" : "var(--paper)"} stroke="var(--forest)" strokeWidth={1} />
        </g>
      ))}
      {/* Summit flag */}
      <line x1={campPts[n][0]} x2={campPts[n][0]} y1={campPts[n][1]} y2={campPts[n][1] - 12} stroke="var(--forest)" strokeWidth={1} />
      <rect x={campPts[n][0]} y={campPts[n][1] - 12} width={7} height={5} fill={pos >= n - 0.01 ? "var(--blaze)" : "var(--paper)"} stroke="var(--forest)" strokeWidth={0.75} />
      {/* You are here */}
      <circle cx={x} cy={y} r={4.5} fill="var(--blaze)" stroke="var(--paper)" strokeWidth={1.5} />
    </svg>
  );
}

export function ElevationProfile({ camps }: { camps: ProfileCamp[] }) {
  const ids = useMemo(() => camps.map((c) => c.id), [camps]);
  const pos = useAscent(ids);
  const active = Math.min(Math.floor(pos + 0.001), camps.length - 1);
  const n = camps.length - 1;
  const lo = camps[0].elevation, hi = camps[n].elevation;
  const here = Math.round(lo + (hi - lo) * (pos / n));

  return (
    <>
      {/* Desktop: sticky rail */}
      <nav aria-label="Case study sections" className="sticky top-8 hidden lg:block">
        <p className="meta text-ink-soft">Elevation profile</p>
        <div className="mt-3">
          <Profile camps={camps} pos={pos} />
        </div>
        <p className="meta mt-2 flex justify-between text-ink-soft">
          <span>EL. {here.toLocaleString("en-US")} FT</span>
          <span>{Math.round((pos / n) * 100)}%</span>
        </p>
        <ol className="mt-6 space-y-1 border-l border-ink/15">
          {camps.map((c, i) => (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                aria-current={i === active ? "step" : undefined}
                className={`-ml-px block border-l-2 py-1.5 pl-4 transition-colors ${
                  i === active ? "border-blaze text-ink" : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                <span className="meta block">{c.name}</span>
                <span className="block leading-tight">{c.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Mobile: fixed strip at the bottom of the sheet */}
      <div className="fixed inset-x-[calc(var(--frame)+1px)] bottom-[calc(var(--frame)+1px)] z-40 border-t border-ink/20 bg-paper/95 px-4 py-2 backdrop-blur-sm lg:hidden">
        <div className="flex items-center gap-4">
          <div className="w-28 shrink-0">
            <Profile camps={camps} pos={pos} compact />
          </div>
          <p className="min-w-0 flex-1 truncate">
            <span className="meta mr-2 text-ink-soft">{camps[active].name}</span>
            {camps[active].label}
          </p>
          <span className="meta text-ink-soft">{here.toLocaleString("en-US")} FT</span>
        </div>
      </div>
    </>
  );
}
