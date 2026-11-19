import { contours } from "d3-contour";
import { geoPath } from "d3-geo";
import { createNoise2D } from "simplex-noise";

/** Small seeded PRNG so the terrain is identical on every build. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fbm(noise: (x: number, y: number) => number, x: number, y: number, octaves = 5) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

export type ContourLine = { d: string; index: boolean; level: number };

/**
 * Marching-squares contour lines over a seeded noise terrain.
 * Returns paths in the coordinate space of `width` x `height`.
 */
export function topoContours({
  width,
  height,
  seed = 7,
  cell = 10,
  levels = 26,
  scale = 0.0021,
  peaks = [] as { x: number; y: number; r: number; h: number }[],
}: {
  width: number;
  height: number;
  seed?: number;
  cell?: number;
  levels?: number;
  scale?: number;
  peaks?: { x: number; y: number; r: number; h: number }[];
}): ContourLine[] {
  const noise = createNoise2D(mulberry32(seed));
  // Pad the grid past the edges so the closing segments of each contour
  // polygon fall outside the visible area.
  const pad = cell * 3;
  const nx = Math.ceil((width + pad * 2) / cell) + 1;
  const ny = Math.ceil((height + pad * 2) / cell) + 1;
  const values = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = i * cell - pad, y = j * cell - pad;
      let v = fbm(noise, x * scale, y * scale);
      // Ridged component gives the terrain crests rather than blobs.
      v += 0.35 * (1 - Math.abs(fbm(noise, x * scale * 0.6 + 40, y * scale * 0.6 + 40, 3)));
      for (const p of peaks) {
        const d2 = ((x - p.x) ** 2 + (y - p.y) ** 2) / (p.r * p.r);
        v += p.h * Math.exp(-d2);
      }
      values[j * nx + i] = v;
    }
  }
  let min = Infinity, max = -Infinity;
  for (const v of values) { if (v < min) min = v; if (v > max) max = v; }
  const step = (max - min) / levels;
  const thresholds = Array.from({ length: levels - 1 }, (_, k) => min + step * (k + 1));

  const gen = contours().size([nx, ny]).thresholds(thresholds).smooth(true);
  const path = geoPath().digits(1);
  return gen(Array.from(values)).map((mp, k) => {
    // Scale grid coordinates to output space.
    const scaled = {
      ...mp,
      coordinates: mp.coordinates.map((poly) => poly.map((ring) => ring.map(([x, y]) => [x * cell - pad, y * cell - pad]))),
    };
    return { d: path(scaled as never) ?? "", index: (k + 1) % 5 === 0, level: k };
  }).filter((c) => c.d);
}

/** A ridgeline as a closed path (filled to the bottom edge) for layered horizons. */
export function ridgeline({
  width,
  height,
  base,
  amplitude,
  seed,
  roughness = 0.0032,
  step = 8,
  crest,
}: {
  width: number;
  height: number;
  base: number;
  amplitude: number;
  seed: number;
  roughness?: number;
  step?: number;
  /** Optional dominant peak at this x position. */
  crest?: { x: number; h: number; w: number };
}) {
  const noise = createNoise2D(mulberry32(seed));
  const pts: [number, number][] = [];
  for (let x = -40; x <= width + 40; x += step) {
    let y = base - amplitude * (0.5 + 0.5 * fbm((n, m) => noise(n, m), x * roughness, seed * 0.13, 5));
    if (crest) y -= crest.h * Math.exp(-(((x - crest.x) / crest.w) ** 2));
    pts.push([x, y]);
  }
  const top = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const line = top;
  const fill = `${top}L${width + 40} ${height + 40}L-40 ${height + 40}Z`;
  // Highest point, for the summit marker.
  const peak = pts.reduce((a, b) => (b[1] < a[1] && b[0] > 0 && b[0] < width ? b : a));
  return { line, fill, peak };
}
