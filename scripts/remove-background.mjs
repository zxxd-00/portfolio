import sharp from "sharp";

/**
 * Remove the plain studio background from a CAD render (SolidWorks-style light
 * gray/white gradient). Flood-fills inward from the image border through pixels
 * that look like background (light and nearly colorless, close to their
 * neighbor), so the fill stops at the part's outlines and shading. Returns a PNG
 * buffer with transparency and a 1px feathered edge.
 */
export async function removeBackground(input) {
  const { data, info } = await sharp(input).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
  const sat = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b);
  const isBg = (c) => lum(c) > 190 && sat(c) < 40;

  const bg = new Uint8Array(W * H);
  const stack = [];
  const seed = (x, y) => {
    const i = y * W + x;
    if (!bg[i] && isBg(px(i))) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }

  while (stack.length) {
    const i = stack.pop();
    const x = i % W, y = (i / W) | 0;
    const c = px(i);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (bg[j]) continue;
      const d = px(j);
      // Background is a smooth gradient: neighbors differ only slightly.
      if (isBg(d) && Math.abs(lum(d) - lum(c)) < 6) {
        bg[j] = 1;
        stack.push(j);
      }
    }
  }

  // Holes and cutouts: enclosed smooth regions whose tone matches the background
  // gradient at the same height are background seen through the part.
  const rowSum = new Float64Array(H), rowN = new Uint32Array(H);
  for (let i = 0; i < W * H; i++) if (bg[i]) { const y = (i / W) | 0; rowSum[y] += lum(px(i)); rowN[y]++; }
  const rowBg = (y) => {
    for (let d = 0; d < H; d++) {
      for (const yy of [y - d, y + d]) if (yy >= 0 && yy < H && rowN[yy] > 3) return rowSum[yy] / rowN[yy];
    }
    return 240;
  };
  const seen = new Uint8Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (bg[s] || seen[s] || !isBg(px(s))) continue;
    const comp = [s];
    seen[s] = 1;
    let sum = 0, sumY = 0;
    for (let k = 0; k < comp.length; k++) {
      const i = comp[k], x = i % W, y = (i / W) | 0, c = px(i);
      sum += lum(c); sumY += y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (seen[j] || bg[j]) continue;
        const d = px(j);
        if (isBg(d) && Math.abs(lum(d) - lum(c)) < 6) { seen[j] = 1; comp.push(j); }
      }
    }
    const mean = sum / comp.length;
    if (comp.length > 40 && Math.abs(mean - rowBg(Math.round(sumY / comp.length))) < 10) for (const i of comp) bg[i] = 1;
  }

  // Soft shadows under the part: light, neutral, and bordering removed background.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < W * H; i++) {
      if (bg[i]) continue;
      const c = px(i);
      if (lum(c) > 150 && sat(c) < 18) {
        const x = i % W, y = (i / W) | 0;
        const near = (x > 0 && bg[i - 1]) || (x < W - 1 && bg[i + 1]) || (y > 0 && bg[i - W]) || (y < H - 1 && bg[i + W]);
        if (near && Math.abs(lum(c) - 200) < 60 && !hasEdgeNear(i)) bg[i] = 2;
      }
    }
  }
  function hasEdgeNear(i) {
    const x = i % W, y = (i / W) | 0;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (lum(px(ny * W + nx)) < 110) return true;
      }
    return false;
  }

  const out = Buffer.from(data);
  for (let i = 0; i < W * H; i++) {
    if (bg[i]) { out[i * 4 + 3] = 0; continue; }
    // Feather: partially transparent where a removed neighbor touches.
    const x = i % W, y = (i / W) | 0;
    const n = (x > 0 && bg[i - 1] ? 1 : 0) + (x < W - 1 && bg[i + 1] ? 1 : 0) + (y > 0 && bg[i - W] ? 1 : 0) + (y < H - 1 && bg[i + W] ? 1 : 0);
    if (n) out[i * 4 + 3] = Math.round(255 * (1 - n * 0.15));
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 0 }).png({ compressionLevel: 9 }).toBuffer();
}
