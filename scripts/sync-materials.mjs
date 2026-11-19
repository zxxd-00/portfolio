#!/usr/bin/env node
/**
 * Sync materials/ -> public/materials/
 *
 *  - Copies images, PDFs, videos and .glb files so Next.js can serve them.
 *  - Converts every .stl into an optimized .glb (welded, simplified when huge,
 *    quantized) for <model-viewer>. Conversion is skipped when the .glb is
 *    newer than its source STL.
 *  - Copies materials/resume.pdf to public/materials/resume.pdf.
 *
 * Runs automatically before `npm run dev` and `npm run build`.
 */
import fs from "node:fs";
import path from "node:path";
import { Document, NodeIO, getBounds } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { weld, simplify, quantize, dedup, prune } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import { removeBackground } from "./remove-background.mjs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
/** Optional converters: missing ones are skipped with a warning instead of failing the build. */
function optional(name) {
  try {
    return require(name);
  } catch {
    return null;
  }
}
const ffmpegPath = optional("ffmpeg-static");

const ROOT = process.cwd();
const SRC = path.join(ROOT, "materials");
const OUT = path.join(ROOT, "public", "materials");

const COPY_EXT = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg",
  ".pdf", ".mp4", ".webm", ".glb",
]);
const MAX_TRIANGLES = 150_000;
const RASTER = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_EDGE = 2000;
const HEIC = new Set([".heic", ".heif"]);
const VIDEO_SRC = new Set([".mov", ".mp4", ".m4v"]);

/**
 * iPhone HEIC -> JPEG. HEIC needs an HEVC decoder that the prebuilt sharp and
 * libheif-js builds don't handle reliably, so this uses Windows' own imaging
 * codecs. The result is cached in materials/<project>/_web/, which is committed,
 * so builds on other platforms (Vercel) just copy it.
 */
async function heicToJpeg(src, dest) {
  if (process.platform !== "win32") throw new Error("HEIC conversion runs on Windows; export the photo as JPG instead");
  const tmp = dest + ".tmp.jpg";
  const ps = [
    "Add-Type -AssemblyName PresentationCore;",
    "$fs=[IO.File]::OpenRead($env:HEIC_SRC);",
    "$d=[Windows.Media.Imaging.BitmapDecoder]::Create($fs,'None','OnLoad');",
    "$e=New-Object Windows.Media.Imaging.JpegBitmapEncoder; $e.QualityLevel=95;",
    "$e.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($d.Frames[0]));",
    "$o=[IO.File]::Create($env:HEIC_DEST); $e.Save($o); $o.Close(); $fs.Close()",
  ].join(" ");
  execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], {
    env: { ...process.env, HEIC_SRC: src, HEIC_DEST: tmp },
    stdio: "pipe",
  });
  await sharp(tmp)
    .rotate()
    .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(dest);
  fs.rmSync(tmp, { force: true });
  console.log(`  heic→jpg ${path.relative(ROOT, src)}  ${(fs.statSync(dest).size / 1024).toFixed(0)} KB`);
}

/**
 * Phone video -> H.264/AAC MP4 that plays in every browser, max 1080 px on the
 * long edge, with a poster frame. Rotation metadata is applied by ffmpeg.
 * Cached in materials/<project>/_web/ like HEIC output.
 */
function videoToMp4(src, dest, poster, crop) {
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) throw new Error("ffmpeg-static binary is not available");
  const scale = "scale='if(gt(iw,ih),min(1080,iw),-2)':'if(gt(iw,ih),-2,min(1080,ih))'";
  // Optional crop (w:h:x:y in source pixels), e.g. to trim a screen recording down to the app viewport.
  const vf = crop ? `crop=${crop},${scale}` : scale;
  execFileSync(ffmpegPath, [
    "-y", "-loglevel", "error", "-i", src,
    "-map", "0:v:0", "-map", "0:a:0?",
    "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", dest,
  ]);
  // Poster: ffmpeg's "thumbnail" filter picks the most representative frame,
  // which skips motion-blurred frames at the start of a phone clip.
  execFileSync(ffmpegPath, ["-y", "-loglevel", "error", "-i", dest, "-vf", "thumbnail=n=120", "-frames:v", "1", "-q:v", "4", poster]);
  console.log(`  video    ${path.relative(ROOT, src)}  ${(fs.statSync(src).size / 1048576).toFixed(1)} MB → ${(fs.statSync(dest).size / 1048576).toFixed(1)} MB`);
}

/**
 * Web-size photos: apply EXIF rotation, cap the long edge, recompress.
 * Keeps the same filename and format so URLs don't change.
 */
async function optimizeImage(src, dest) {
  const ext = path.extname(src).toLowerCase();
  const img = sharp(src).rotate().resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true });
  if (ext === ".png") await img.png({ compressionLevel: 9, palette: false }).toFile(dest);
  else if (ext === ".webp") await img.webp({ quality: 80 }).toFile(dest);
  else await img.jpeg({ quality: 80, mozjpeg: true }).toFile(dest);
  const kb = (b) => (b / 1024).toFixed(0) + " KB";
  const before = fs.statSync(src).size, after = fs.statSync(dest).size;
  if (after > before) fs.copyFileSync(src, dest); // already small: keep the original
  console.log(`  image    ${path.relative(ROOT, src)}  ${kb(before)} → ${kb(Math.min(before, after))}`);
}

const PROJECT_DIRS = [
  "01-upright",
  "02-bell-crank",
  "03-strain-gauge-daq",
  "04-verity",
  "05-night-shift",
  "06-kentucky-mycelium",
  "07-iowa-state-cv",
  "headshot",
];

function newer(src, dest) {
  if (!fs.existsSync(dest)) return true;
  return fs.statSync(src).mtimeMs > fs.statSync(dest).mtimeMs;
}

/**
 * On CI (Vercel), git checkout resets every file's mtime, so mtimes can't say
 * whether a cached conversion is stale. Trust the committed _web/ cache there and
 * only convert when no cached output exists.
 */
const ON_CI = !!(process.env.VERCEL || process.env.CI);
function stale(src, cached) {
  if (!fs.existsSync(cached)) return true;
  return !ON_CI && newer(src, cached);
}

/** Parse binary or ASCII STL into a flat Float32Array of triangle vertices + facet normals. */
function parseSTL(buf) {
  const isBinary = (() => {
    if (buf.length < 84) return false;
    const n = buf.readUInt32LE(80);
    if (84 + n * 50 === buf.length) return true;
    return !buf.subarray(0, 512).toString("latin1").trimStart().startsWith("solid");
  })();

  if (isBinary) {
    const n = buf.readUInt32LE(80);
    const pos = new Float32Array(n * 9);
    const nor = new Float32Array(n * 9);
    for (let i = 0; i < n; i++) {
      const o = 84 + i * 50;
      const nx = buf.readFloatLE(o), ny = buf.readFloatLE(o + 4), nz = buf.readFloatLE(o + 8);
      for (let v = 0; v < 3; v++) {
        const vo = o + 12 + v * 12;
        pos.set([buf.readFloatLE(vo), buf.readFloatLE(vo + 4), buf.readFloatLE(vo + 8)], i * 9 + v * 3);
        nor.set([nx, ny, nz], i * 9 + v * 3);
      }
    }
    return { pos, nor };
  }

  const text = buf.toString("utf8");
  const verts = [];
  const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
  let m;
  while ((m = re.exec(text))) verts.push(+m[1], +m[2], +m[3]);
  return { pos: new Float32Array(verts), nor: null };
}

const CREASE = Math.cos((32 * Math.PI) / 180);

/**
 * mm -> m, lay the part flat, then build an indexed mesh with crease-angle normals:
 * smooth across curved surfaces, sharp across CAD edges sharper than 32°.
 */
function prepare({ pos }) {
  const tris = pos.length / 9;
  // Exports disagree on "up" (SolidWorks is Y-up, Fusion/Onshape Z-up), so lay the
  // part flat: its thinnest axis becomes glTF's +Y. Rotations keep winding intact.
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i++) {
    const a = i % 3;
    if (pos[i] < mn[a]) mn[a] = pos[i];
    if (pos[i] > mx[a]) mx[a] = pos[i];
  }
  const ext = mx.map((v, a) => v - mn[a]);
  const up = ext.indexOf(Math.min(...ext));
  const p = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i] * 0.001, y = pos[i + 1] * 0.001, z = pos[i + 2] * 0.001;
    if (up === 1) { p[i] = x; p[i + 1] = y; p[i + 2] = z; }        // already Y-up
    else if (up === 2) { p[i] = x; p[i + 1] = z; p[i + 2] = -y; }  // Z-up -> Y-up
    else { p[i] = -y; p[i + 1] = x; p[i + 2] = z; }                // X-up -> Y-up
  }

  // Area-weighted face normals (cross product length = 2 * area).
  const fn = new Float32Array(tris * 3);
  const fu = new Float32Array(tris * 3);
  for (let t = 0; t < tris; t++) {
    const o = t * 9;
    const ax = p[o + 3] - p[o], ay = p[o + 4] - p[o + 1], az = p[o + 5] - p[o + 2];
    const bx = p[o + 6] - p[o], by = p[o + 7] - p[o + 1], bz = p[o + 8] - p[o + 2];
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const len = Math.hypot(nx, ny, nz) || 1;
    fn.set([nx, ny, nz], t * 3);
    fu.set([nx / len, ny / len, nz / len], t * 3);
  }

  // Group triangle corners by (quantized) position.
  const key = (i) => `${Math.round(p[i] * 1e5)},${Math.round(p[i + 1] * 1e5)},${Math.round(p[i + 2] * 1e5)}`;
  const groups = new Map();
  for (let c = 0; c < tris * 3; c++) {
    const k = key(c * 3);
    let g = groups.get(k);
    if (!g) groups.set(k, (g = []));
    g.push(c);
  }

  const outPos = [];
  const outNor = [];
  const index = new Uint32Array(tris * 3);
  const vmap = new Map();
  for (const corners of groups.values()) {
    for (const c of corners) {
      const t = Math.floor(c / 3);
      let nx = 0, ny = 0, nz = 0;
      for (const c2 of corners) {
        const t2 = Math.floor(c2 / 3);
        const dot = fu[t * 3] * fu[t2 * 3] + fu[t * 3 + 1] * fu[t2 * 3 + 1] + fu[t * 3 + 2] * fu[t2 * 3 + 2];
        if (dot >= CREASE) {
          nx += fn[t2 * 3]; ny += fn[t2 * 3 + 1]; nz += fn[t2 * 3 + 2];
        }
      }
      const len = Math.hypot(nx, ny, nz) || 1;
      const q = (v) => Math.round((v / len) * 1000) / 1000;
      const n = [q(nx), q(ny), q(nz)];
      const vk = `${key(c * 3)}|${n.join(",")}`;
      let vi = vmap.get(vk);
      if (vi === undefined) {
        vi = outPos.length / 3;
        vmap.set(vk, vi);
        outPos.push(p[c * 3], p[c * 3 + 1], p[c * 3 + 2]);
        outNor.push(...n);
      }
      index[c] = vi;
    }
  }
  return { p: new Float32Array(outPos), n: new Float32Array(outNor), index, tris };
}

/**
 * STEP -> flat triangle list (mm), via OpenCascade compiled to WebAssembly.
 * Same shape as parseSTL's output so it goes through the same pipeline.
 */
async function parseSTEP(buf) {
  const occtimportjs = optional("occt-import-js");
  if (!occtimportjs) throw new Error("occt-import-js is not installed");
  const occt = await occtimportjs();
  const result = occt.ReadStepFile(new Uint8Array(buf), { linearUnit: "millimeter", linearDeflectionType: "bounding_box_ratio", linearDeflection: 0.0008, angularDeflection: 0.35 });
  if (!result.success || !result.meshes.length) throw new Error("no geometry in STEP file");
  const out = [];
  for (const m of result.meshes) {
    const pos = m.attributes.position.array;
    for (const i of m.index.array) out.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  }
  return { pos: new Float32Array(out), nor: null };
}

async function stlToGlb(src, dest) {
  const ext = path.extname(src).toLowerCase();
  const parsed = ext === ".step" || ext === ".stp" ? await parseSTEP(fs.readFileSync(src)) : parseSTL(fs.readFileSync(src));
  const { p, n, index, tris } = prepare(parsed);
  const doc = new Document();
  const buffer = doc.createBuffer();
  const material = doc
    .createMaterial("machined")
    .setBaseColorFactor([0.62, 0.61, 0.58, 1])
    .setMetallicFactor(0.55)
    .setRoughnessFactor(0.42);
  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(p).setBuffer(buffer))
    .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(n).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType("SCALAR").setArray(index).setBuffer(buffer))
    .setMaterial(material);
  const mesh = doc.createMesh(path.basename(src, path.extname(src))).addPrimitive(prim);
  const node = doc.createNode("part").setMesh(mesh);
  doc.createScene("scene").addChild(node);

  await MeshoptSimplifier.ready;
  const transforms = [dedup()];
  if (tris > MAX_TRIANGLES) {
    transforms.push(simplify({ simplifier: MeshoptSimplifier, ratio: MAX_TRIANGLES / tris, error: 0.0005 }));
  }
  transforms.push(quantize(), prune());
  await doc.transform(...transforms);

  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  await io.write(dest, doc);
  const kb = (b) => (b / 1024).toFixed(0) + " KB";
  console.log(`  ${ext.slice(1)}→glb  ${path.relative(ROOT, src)}  ${kb(fs.statSync(src).size)} → ${kb(fs.statSync(dest).size)}`);
}

/**
 * Materials for CAD hardware, chosen from part names (McMaster-style names
 * describe the finish). Anything unmatched is treated as the machined part.
 */
const FINISHES = [
  { test: /black[- ]oxide|alloy steel/i, name: "black-oxide steel", color: [0.07, 0.07, 0.075], metal: 0.6, rough: 0.5 },
  { test: /stainless/i, name: "stainless steel", color: [0.72, 0.72, 0.7], metal: 0.9, rough: 0.32 },
  { test: /bronze|brass/i, name: "bronze", color: [0.72, 0.5, 0.27], metal: 0.85, rough: 0.38 },
  { test: /steel|zinc|locknut|washer/i, name: "zinc-plated steel", color: [0.62, 0.63, 0.62], metal: 0.85, rough: 0.4 },
];
const MACHINED = { name: "machined aluminum", color: [0.78, 0.78, 0.76], metal: 0.65, rough: 0.36 };

/**
 * Optimize a CAD-exported GLB: drop cameras, give parts finishes by name, lay
 * the assembly flat (thinnest axis up, like the STL path), weld + quantize.
 */
async function optimizeGlb(src, dest) {
  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  const doc = await io.read(src);
  const root = doc.getRoot();

  for (const node of root.listNodes()) if (node.getCamera()) node.setCamera(null);
  for (const cam of root.listCameras()) cam.dispose();

  const made = new Map();
  const finish = (f) => {
    if (!made.has(f.name)) {
      made.set(f.name, doc.createMaterial(f.name).setBaseColorFactor([...f.color, 1]).setMetallicFactor(f.metal).setRoughnessFactor(f.rough));
    }
    return made.get(f.name);
  };
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    // A mesh node's own name can be generic; fall back to its named ancestors.
    let label = node.getName();
    for (let p = node.getParentNode(); p && !FINISHES.some((f) => f.test.test(label)); p = p.getParentNode()) label += " " + p.getName();
    const f = FINISHES.find((x) => x.test.test(label)) ?? MACHINED;
    for (const prim of mesh.listPrimitives()) prim.setMaterial(finish(f));
  }

  // Lay flat: rotate the scene so its thinnest axis points up (+Y).
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  const { min, max } = getBounds(scene);
  const ext = max.map((v, i) => v - min[i]);
  const up = ext.indexOf(Math.min(...ext));
  if (up !== 1) {
    const s45 = Math.SQRT1_2;
    const pivot = doc.createNode("lay-flat").setRotation(up === 2 ? [-s45, 0, 0, s45] : [0, 0, s45, s45]);
    for (const child of scene.listChildren()) {
      scene.removeChild(child);
      pivot.addChild(child);
    }
    scene.addChild(pivot);
  }

  await MeshoptSimplifier.ready;
  const tris = root
    .listMeshes()
    .reduce((a, m) => a + m.listPrimitives().reduce((b, p) => b + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3, 0), 0);
  const transforms = [dedup(), weld()];
  if (tris > MAX_TRIANGLES * 2) transforms.push(simplify({ simplifier: MeshoptSimplifier, ratio: (MAX_TRIANGLES * 2) / tris, error: 0.0005 }));
  transforms.push(quantize(), prune());
  await doc.transform(...transforms);
  await io.write(dest, doc);
  const kb = (b) => (b / 1024).toFixed(0) + " KB";
  console.log(`  glb      ${path.relative(ROOT, src)}  ${kb(fs.statSync(src).size)} → ${kb(fs.statSync(dest).size)}  (${[...made.keys()].join(", ")})`);
}

/**
 * Headshot: crop to 4:5 around the subject using materials/headshot/crop.txt
 * ("x y width" as fractions of the photo) and write portrait.jpg.
 */
async function headshotPortrait(srcDir, outDir) {
  const cropFile = path.join(srcDir, "crop.txt");
  const photo = fs.readdirSync(srcDir).find((f) => RASTER.has(path.extname(f).toLowerCase()));
  if (!photo || !fs.existsSync(cropFile)) return null;
  const dest = path.join(outDir, "portrait.jpg");
  const src = path.join(srcDir, photo);
  if (!newer(src, dest) && !newer(cropFile, dest)) return "portrait.jpg";
  const nums = fs.readFileSync(cropFile, "utf8").split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"))[0]?.trim().split(/\s+/).map(Number);
  if (!nums || nums.length < 3 || nums.some(Number.isNaN)) return null;
  const rotated = await sharp(src).rotate().toBuffer();
  const { width: W, height: H } = await sharp(rotated).metadata();
  const w = Math.min(W, Math.round(nums[2] * W));
  const h = Math.min(H, Math.round(w * 1.25));
  const left = Math.max(0, Math.min(W - w, Math.round(nums[0] * W)));
  const top = Math.max(0, Math.min(H - h, Math.round(nums[1] * H)));
  await sharp(rotated).extract({ left, top, width: w, height: h }).resize(1000, 1250, { fit: "cover" }).jpeg({ quality: 82, mozjpeg: true }).toFile(dest);
  console.log(`  portrait materials/headshot/${photo} → portrait.jpg`);
  return "portrait.jpg";
}

/** Per-folder options read from notes.txt, e.g. "video-crop: clip.mp4 | 1884:732:0:218". */
function folderOptions(srcDir) {
  const crops = new Map();
  const cutouts = new Set();
  const notes = path.join(srcDir, "notes.txt");
  if (fs.existsSync(notes)) {
    for (const line of fs.readFileSync(notes, "utf8").split(/\r?\n/)) {
      const bgLine = line.match(/^\s*remove-background:\s*(.+)$/i);
      if (bgLine) for (const f of bgLine[1].split("|")) if (f.trim()) cutouts.add(f.trim().toLowerCase());
      const m = line.match(/^\s*video-crop:\s*([^|]+?)\s*\|\s*(\d+:\d+:\d+:\d+)\s*$/i);
      if (m) crops.set(m[1].toLowerCase(), m[2]);
    }
  }
  return { crops, cutouts, notes };
}

async function main() {
  fs.mkdirSync(SRC, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const d of PROJECT_DIRS) fs.mkdirSync(path.join(SRC, d), { recursive: true });

  const resume = path.join(SRC, "resume.pdf");
  if (fs.existsSync(resume) && newer(resume, path.join(OUT, "resume.pdf"))) {
    fs.copyFileSync(resume, path.join(OUT, "resume.pdf"));
    console.log("  copied   materials/resume.pdf");
  }

  for (const dir of fs.readdirSync(SRC, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const srcDir = path.join(SRC, dir.name);
    const outDir = path.join(OUT, dir.name);
    fs.mkdirSync(outDir, { recursive: true });

    // Converted HEIC/video live in _web/ (committed) and are copied as-is.
    const cacheDir = path.join(srcDir, "_web");
    const { crops, cutouts, notes: notesFile } = folderOptions(srcDir);
    // Every file that should exist in public/materials/<dir>; anything else is stale.
    const expected = new Set();
    if (fs.existsSync(cacheDir)) for (const f of fs.readdirSync(cacheDir)) expected.add(f);

    for (const file of fs.readdirSync(srcDir)) {
      const src = path.join(srcDir, file);
      if (!fs.statSync(src).isFile()) continue;
      const ext = path.extname(file).toLowerCase();
      if (ext === ".stl" || ext === ".step" || ext === ".stp") {
        // Converted models are cached in _web/ (committed), so raw CAD exports can stay out of git.
        const cached = path.join(cacheDir, path.basename(file, path.extname(file)) + ".glb");
        expected.add(path.basename(cached));
        if (stale(src, cached)) {
          try {
            fs.mkdirSync(cacheDir, { recursive: true });
            await stlToGlb(src, cached);
          } catch (err) {
            console.warn(`  ! could not convert ${file}: ${err.message}`);
          }
        }
      } else if (HEIC.has(ext)) {
        const cached = path.join(cacheDir, path.basename(file, path.extname(file)) + ".jpg");
        if (stale(src, cached)) {
          try {
            fs.mkdirSync(cacheDir, { recursive: true });
            await heicToJpeg(src, cached);
          } catch (err) {
            console.warn(`  ! could not convert ${file}: ${err.message}`);
          }
        }
      } else if (VIDEO_SRC.has(ext)) {
        const stem = path.basename(file, path.extname(file));
        const cached = path.join(cacheDir, stem + ".mp4");
        expected.add(stem + ".mp4").add(stem + ".poster.jpg");
        if (stale(src, cached)) {
          try {
            fs.mkdirSync(cacheDir, { recursive: true });
            videoToMp4(src, cached, path.join(cacheDir, stem + ".poster.jpg"), crops.get(file.toLowerCase()));
          } catch (err) {
            console.warn(`  ! could not convert ${file}: ${err.message}`);
          }
        }
      } else if (ext === ".glb") {
        const dest = path.join(outDir, file);
        if (newer(src, dest)) {
          try {
            await optimizeGlb(src, dest);
          } catch (err) {
            // A GLB that can't be parsed is usually an interrupted or empty export:
            // leave it out so the page shows the "model pending" placeholder instead.
            console.warn(`  ! skipped ${file}: not a readable model (${err.message}). Re-export it from CAD.`);
            fs.rmSync(dest, { force: true });
          }
        }
        if (fs.existsSync(dest)) expected.add(file);
      } else if (ext === ".png" && cutouts.has(file.toLowerCase())) {
        // CAD render with its studio background removed (notes.txt "remove-background:").
        const dest = path.join(outDir, file);
        expected.add(file);
        if (newer(src, dest) || newer(notesFile, dest)) {
          try {
            const png = await removeBackground(fs.readFileSync(src));
            await sharp(png).resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(dest);
            console.log(`  cutout   ${path.relative(ROOT, src)}  background removed`);
          } catch (err) {
            console.warn(`  ! could not remove background from ${file}: ${err.message}`);
            fs.copyFileSync(src, dest);
          }
        }
      } else if (RASTER.has(ext)) {
        const dest = path.join(outDir, file);
        expected.add(file);
        if (newer(src, dest)) {
          try {
            await optimizeImage(src, dest);
          } catch (err) {
            console.warn(`  ! could not optimize ${file}: ${err.message}`);
            fs.copyFileSync(src, dest);
          }
        }
      } else if (COPY_EXT.has(ext)) {
        const dest = path.join(outDir, file);
        expected.add(file);
        if (newer(src, dest)) fs.copyFileSync(src, dest);
      }
    }

    if (dir.name === "headshot") {
      const portrait = await headshotPortrait(srcDir, outDir);
      if (portrait) expected.add(portrait);
    }

    for (const f of fs.readdirSync(outDir)) {
      if (!expected.has(f)) {
        fs.rmSync(path.join(outDir, f), { force: true });
        console.log(`  removed  public/materials/${dir.name}/${f} (source gone)`);
      }
    }
  }
  for (const dir of fs.readdirSync(SRC, { withFileTypes: true })) {
    const cacheDir = path.join(SRC, dir.name, "_web");
    if (!dir.isDirectory() || !fs.existsSync(cacheDir)) continue;
    for (const file of fs.readdirSync(cacheDir)) {
      const src = path.join(cacheDir, file);
      const dest = path.join(OUT, dir.name, file);
      if (newer(src, dest)) fs.copyFileSync(src, dest);
    }
  }
  console.log("materials synced → public/materials");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
