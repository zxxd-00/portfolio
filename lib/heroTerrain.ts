import { topoContours } from "./topo";

/** Hero viewBox and the oversized contour field that sits behind (and inside) the ridges. */
export const HERO_W = 1600;
export const HERO_H = 900;
export const FIELD_MX = 450;
export const FIELD_MY = 250;
export const FIELD_W = HERO_W + FIELD_MX * 2;
export const FIELD_H = HERO_H + FIELD_MY * 2;

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
  const paths = lines
    .map((l) =>
      l.index
        ? `<path d="${l.d}" stroke-width="1.1" stroke-opacity=".62"/>`
        : `<path d="${l.d}" stroke-width=".55" stroke-opacity=".38"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FIELD_W} ${FIELD_H}" width="${FIELD_W}" height="${FIELD_H}"><g fill="none" stroke="#9b6a3c" stroke-linejoin="round">${paths}</g></svg>`;
}
