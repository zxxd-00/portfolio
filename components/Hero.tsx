import { ridgeline } from "@/lib/topo";
import { FIELD_H, FIELD_MX, FIELD_MY, FIELD_W, HERO_H as H, HERO_W as W } from "@/lib/heroTerrain";
import { Parallax } from "./Parallax";

const BAND_SHIFT = [[260, 140], [-300, 200], [180, 240], [-220, 230]];

/** The contour field is a static, cached SVG (see app/topo.svg/route.ts). */
function Field({ dx = 0, dy = 0 }: { dx?: number; dy?: number }) {
  return <image href="/topo.svg" x={-FIELD_MX + dx} y={-FIELD_MY + dy} width={FIELD_W} height={FIELD_H} />;
}

export function Hero() {
  const ridges = [
    { base: 560, amplitude: 210, seed: 3, roughness: 0.0024, stroke: "var(--contour-soft)", sw: 1, depth: 9 },
    { base: 640, amplitude: 190, seed: 8, roughness: 0.0029, stroke: "var(--contour)", sw: 1, depth: 15, crest: { x: 330, h: 70, w: 180 } },
    { base: 740, amplitude: 170, seed: 21, roughness: 0.0034, stroke: "var(--contour)", sw: 1.25, depth: 23 },
    { base: 860, amplitude: 150, seed: 5, roughness: 0.0026, stroke: "var(--forest)", sw: 1.6, depth: 34, crest: { x: 1130, h: 120, w: 260 } },
  ].map((r) => ({ ...r, ...ridgeline({ width: W, height: H, ...r }) }));

  const front = ridges[ridges.length - 1];
  const [px, py] = front.peak;

  // The trail walks the front crest from the left up to its summit.
  const trail = front.line
    .split("L")
    .map((seg) => seg.replace("M", "").split(" ").map(Number) as [number, number])
    .filter(([x]) => x >= px - 520 && x <= px)
    .map(([x, y], i) => `${i ? "L" : "M"}${x} ${(y + 9).toFixed(1)}`)
    .join("");

  return (
    <section aria-labelledby="map-title" className="relative isolate overflow-hidden border-b border-ink/15">
      <Parallax className="absolute inset-0 -z-10">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className="h-full w-full" aria-hidden>
          <defs>
            {ridges.map((r, i) => (
              <clipPath key={i} id={`ridge-${i}`}>
                <path d={r.fill} />
              </clipPath>
            ))}
          </defs>
          <g data-depth="5">
            <Field />
          </g>
          {ridges.map((r, i) => (
            <g key={i} data-depth={r.depth}>
              <path d={r.fill} fill="var(--paper)" />
              {/* Each band carries its own terrain, offset so lines don't continue across the crest. */}
              <g clipPath={`url(#ridge-${i})`} opacity={0.32 + i * 0.08}>
                <Field dx={BAND_SHIFT[i][0]} dy={BAND_SHIFT[i][1]} />
              </g>
              <path d={r.line} fill="none" stroke={r.stroke} strokeWidth={r.sw} strokeLinejoin="round" />
              {i === ridges.length - 1 && (
                <>
                  <mask id="trail-reveal">
                    <path d={trail} fill="none" stroke="#fff" strokeWidth={8} pathLength={1} className="hero-trail" />
                  </mask>
                  <path d={trail} fill="none" stroke="var(--blaze)" strokeWidth={2.2} strokeDasharray="7 7" mask="url(#trail-reveal)" />
                  <g transform={`translate(${px} ${py})`}>
                    <path d="M0 -2 L-9 14 L9 14 Z" fill="var(--paper)" stroke="var(--forest)" strokeWidth={1.4} />
                    <line x1={0} y1={-2} x2={0} y2={-30} stroke="var(--forest)" strokeWidth={1.4} />
                    <rect x={0} y={-30} width={14} height={9} fill="var(--blaze)" className="hero-flag" />
                  </g>
                </>
              )}
            </g>
          ))}
        </svg>
      </Parallax>

      <div className="mx-auto flex min-h-[min(88vh,820px)] max-w-6xl flex-col px-4 pt-12 pb-[38vh] sm:px-8 sm:pt-20 md:pb-[30vh]">
        <p className="meta halo text-ink-soft">Berkeley, California · Engineering series · {new Date().getFullYear()}</p>
        <h1
          id="map-title"
          className="font-display halo mt-4 text-[clamp(3.6rem,13vw,10.5rem)] leading-[0.86] tracking-[0.08em] text-forest uppercase"
        >
          Zaid
          <br />
          Adassi
        </h1>
        <p className="font-display mt-6 w-fit border-l-4 border-blaze bg-paper/90 py-1.5 pr-3 pl-3 text-[clamp(1.35rem,2.8vw,2.1rem)] tracking-[0.06em] text-forest uppercase">
          Mechanical Engineering at UC Berkeley
        </p>
      </div>
    </section>
  );
}
