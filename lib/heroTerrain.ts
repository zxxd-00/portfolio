import { topoContours } from "./topo";

/** Hero viewBox and the oversized contour field that sits behind (and inside) the ridges. */
export const HERO_W = 1600;
export const HERO_H = 900;
export const FIELD_MX = 450;
export const FIELD_MY = 250;
export const FIELD_W = HERO_W + FIELD_MX * 2;
export const FIELD_H = HERO_H + FIELD_MY * 2;

// USGS base colors (kept in sync with --paper, --woodland, --water-tint, --water, --contour).
const PAPER = "#eee8d5";
const WOODLAND = "#d3dfbb";
const WATER_TINT = "#cddde4";
const WATER = "#3a6d96";
const CONTOUR = "#9b6a3c";

/** Contour levels (of 29) that bound each map feature. */
const WATER_LEVEL = 4; // below this: lake
const WOOD_LOW = 10; // woodland starts above this…
const WOOD_HIGH = 16; // …and gives way to open ground above this

/**
 * The hero's terrain, drawn like a quadrangle: green woodland tint on the
 * mid slopes, a blue lake in the lowest ground with its shoreline in hydro
 * blue, and brown contours everywhere above water.
 */
export function heroFieldSvg() {
  const lines = topoContours({
    width: FIELD_W,
    height: FIELD_H,
    seed: 11,
    cell: 10,
    levels: 30,
    scale: 0.0017,
    peaks: [
      { x: 1180 + FIELD_MX, y: 260 + FIELD_MY, r: 260, h: 0.9 },
      { x: 420 + FIELD_MX, y: 520 + FIELD_MY, r: 320, h: 0.5 },
    ],
  });
  const at = (level: number) => lines.find((l) => l.level === level)?.d ?? "";
  // Everything outside a level's polygon (evenodd against the full frame) = ground below it.
  const below = (level: number) => `M-50 -50H${FIELD_W + 50}V${FIELD_H + 50}H-50Z${at(level)}`;

  const fills = [
    `<path d="${at(WOOD_LOW)}" fill="${WOODLAND}" fill-opacity=".8" fill-rule="evenodd"/>`,
    `<path d="${at(WOOD_HIGH)}" fill="${PAPER}" fill-rule="evenodd"/>`,
    `<path d="${below(WATER_LEVEL)}" fill="${WATER_TINT}" fill-rule="evenodd"/>`,
  ].join("");

  const contours = lines
    .filter((l) => l.level >= WATER_LEVEL)
    .map((l) =>
      l.level === WATER_LEVEL
        ? "" // drawn as shoreline below
        : l.index
          ? `<path d="${l.d}" stroke-width="1.1" stroke-opacity=".62"/>`
          : `<path d="${l.d}" stroke-width=".55" stroke-opacity=".38"/>`,
    )
    .join("");

  // Shoreline, plus two depth lines inside the lake.
  const hydro = [
    `<path d="${at(WATER_LEVEL)}" stroke-width="1.3"/>`,
    `<path d="${at(WATER_LEVEL - 1)}" stroke-width=".6" stroke-opacity=".55"/>`,
    `<path d="${at(WATER_LEVEL - 2)}" stroke-width=".5" stroke-opacity=".4"/>`,
  ].join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FIELD_W} ${FIELD_H}" width="${FIELD_W}" height="${FIELD_H}">${fills}<g fill="none" stroke="${CONTOUR}" stroke-linejoin="round">${contours}</g><g fill="none" stroke="${WATER}" stroke-linejoin="round">${hydro}</g></svg>`;
}
