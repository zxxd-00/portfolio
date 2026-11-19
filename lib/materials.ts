import "server-only";
import fs from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";
import { CAMP_ORDER, TRAIL, titleCase, type Camp, type CampKey, type ProjectBase } from "./projects";

const MATERIALS = path.join(process.cwd(), "materials");
const PUBLIC = path.join(process.cwd(), "public", "materials");

/** Width / height of an image, read from the web copy (EXIF rotation already applied). */
function aspect(dir: string, file: string): number {
  const web = path.join(PUBLIC, dir, file);
  const src = fs.existsSync(web) ? web : path.join(MATERIALS, dir, file);
  try {
    const { width, height, orientation } = imageSize(fs.readFileSync(src));
    if (!width || !height) return 4 / 3;
    return orientation && orientation >= 5 ? height / width : width / height;
  } catch {
    return 4 / 3;
  }
}

export type Media = { src: string; caption: string; kind: "image" | "video"; /** width / height */ ratio: number; poster?: string };
export type Doc = { href: string; name: string };
export type Spec = { label: string; value: string };

export type CampContent = Camp & {
  /** Set by writing "skip" in the camp's notes section: the camp is left off the page. */
  hidden: boolean;
  /** True while the camp only has placeholder copy ("Add ..."), shown as an unsurveyed block. */
  pending: boolean;
  paragraphs: string[];
  specs: Spec[];
  media: Media[];
};

export type Project = Omit<ProjectBase, "camps"> & {
  /** Human-readable time span, e.g. "Aug 2026 – present" (notes.txt "dates:"); falls back to year. */
  dates: string;
  camps: CampContent[];
  cover?: Media;
  gallery: Media[];
  models: string[];
  docs: Doc[];
};

/** Filename prefixes and notes.txt section names that map to each stage. */
const ALIASES: Record<CampKey, string[]> = {
  problem: ["problem", "base-camp", "basecamp", "context"],
  requirements: ["requirements", "reqs", "specs", "research-question", "question"],
  calcs: ["calcs", "hand-calcs", "handcalcs", "calc", "methods", "approach", "architecture", "geometry", "bridge"],
  analysis: ["analysis", "fea", "sim", "simulation", "testing", "test", "prototype", "build", "experiments", "validation", "bench"],
  iterations: ["iterations", "iteration", "iter", "rev", "v1", "v2", "v3"],
  results: ["results", "summit", "findings", "final", "outcome"],
};

const IMAGE = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg", ".heic", ".heif"]);
const VIDEO = new Set([".mp4", ".webm", ".mov", ".m4v"]);

function campForName(name: string): CampKey | "cover" | null {
  const n = name.toLowerCase();
  if (/^(cover|hero)\b/.test(n)) return "cover";
  for (const key of CAMP_ORDER) {
    if (ALIASES[key].some((a) => n === a || n.startsWith(a + "-") || n.startsWith(a + "_") || n.startsWith(a + " "))) return key;
  }
  return null;
}

function captionFrom(file: string) {
  let base = file.replace(/\.[^.]+$/, "");
  const camp = campForName(base);
  if (camp) {
    const alias = camp === "cover" ? base.match(/^(cover|hero)/i)?.[0] ?? "" : ALIASES[camp].find((a) => base.toLowerCase().startsWith(a)) ?? "";
    base = base.slice(alias.length);
  }
  const text = base.replace(/^\d+[-_ ]?/, "").replace(/[-_]+/g, " ").trim();
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}

type Notes = {
  meta: Record<string, string>;
  sections: Partial<Record<CampKey | "summary", { label?: string; lines: string[]; images: { file: string; caption?: string }[] }>>;
};

function parseNotes(text: string): Notes {
  const notes: Notes = { meta: {}, sections: {} };
  let current: { label?: string; lines: string[]; images: { file: string; caption?: string }[] } | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.trimStart().startsWith("#")) continue;
    const header = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (header) {
      const name = header[1].trim().toLowerCase().replace(/\s+/g, "-");
      const key = name === "summary" ? "summary" : (CAMP_ORDER.find((k) => ALIASES[k].includes(name)) ?? null);
      current = key ? (notes.sections[key] = { lines: [], images: [] }) : null;
      continue;
    }
    if (current) {
      const label = line.match(/^label:\s*(.+)$/i);
      // "image: file name.jpg | Caption" places a file in this camp.
      const image = line.match(/^\s*image:\s*([^|]+?)\s*(?:\|\s*(.+))?$/i);
      if (label && current.lines.length === 0) current.label = label[1].trim();
      else if (image) current.images.push({ file: image[1], caption: image[2]?.trim() });
      else current.lines.push(line);
      continue;
    }
    const kv = line.match(/^([a-z]+):\s*(.*)$/i);
    if (kv && kv[2].trim()) notes.meta[kv[1].toLowerCase()] = kv[2].trim();
  }
  return notes;
}

/** Split a section into paragraphs, plain list items and "Label: value" spec rows. */
function parseBody(lines: string[]) {
  const paragraphs: string[] = [];
  const list: string[] = [];
  const specs: Spec[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.length) paragraphs.push(buf.join(" "));
    buf = [];
  };
  for (const l of lines) {
    const t = l.trim();
    if (!t) { flush(); continue; }
    const item = t.match(/^[-*•]\s+(.+)$/);
    if (item) {
      flush();
      const spec = item[1].match(/^([^:]{1,40}):\s+(.+)$/);
      if (spec) specs.push({ label: spec[1].trim(), value: spec[2].trim() });
      else list.push(item[1]);
    } else buf.push(t);
  }
  flush();
  return { paragraphs, list, specs };
}

function listFiles(dir: string) {
  try {
    return fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()).sort();
  } catch {
    return [];
  }
}

export function getProject(base: ProjectBase): Project {
  const dir = path.join(MATERIALS, base.dir);
  const files = listFiles(dir);
  const url = (f: string) => `/materials/${base.dir}/${encodeURIComponent(f)}`;

  let notes: Notes = { meta: {}, sections: {} };
  const notesFile = files.find((f) => f.toLowerCase() === "notes.txt");
  if (notesFile) notes = parseNotes(fs.readFileSync(path.join(dir, notesFile), "utf8"));

  const m = notes.meta;
  const summary = notes.sections.summary ? parseBody(notes.sections.summary.lines).paragraphs.join(" ") : m.summary;
  const hasRealNotes =
    Object.keys(m).length > 0 || Object.values(notes.sections).some((sec) => sec?.lines.some((l) => l.trim()));

  const byCamp: Partial<Record<CampKey, Media[]>> = {};
  const gallery: Media[] = [];
  let cover: Media | undefined;
  const models = new Set<string>();
  const docs: Doc[] = [];

  // Files placed explicitly in notes.txt, matched case-insensitively.
  const placed = new Map<string, { camp: CampKey; caption?: string; order: number }>();
  let order = 0;
  for (const key of CAMP_ORDER) {
    for (const img of notes.sections[key]?.images ?? []) placed.set(img.file.toLowerCase(), { camp: key, caption: img.caption, order: order++ });
  }
  // "cover: file.jpg | Caption"
  const [coverFile, coverCaption] = (m.cover ?? "").split("|").map((x) => x.trim());
  const coverName = coverFile ? coverFile.toLowerCase() : undefined;
  const placedMedia: Partial<Record<CampKey, { media: Media; order: number }[]>> = {};

  // Models converted from STL/STEP live in _web/ (raw CAD files aren't committed).
  for (const f of listFiles(path.join(dir, "_web"))) {
    if (path.extname(f).toLowerCase() === ".glb" && fs.existsSync(path.join(PUBLIC, base.dir, f))) {
      models.add(`/materials/${base.dir}/${encodeURIComponent(f.slice(0, -4))}.glb`);
    }
  }

  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    const stem = f.slice(0, -ext.length);
    if (ext === ".stl" || ext === ".glb" || ext === ".step" || ext === ".stp") {
      // Only list models the sync step produced (unreadable exports are skipped there).
      if (fs.existsSync(path.join(PUBLIC, base.dir, `${stem}.glb`))) models.add(`/materials/${base.dir}/${encodeURIComponent(stem)}.glb`);
      continue;
    }
    if (ext === ".pdf") {
      docs.push({ href: url(f), name: captionFrom(f) || stem });
      continue;
    }
    const kind = IMAGE.has(ext) ? "image" : VIDEO.has(ext) ? "video" : null;
    if (!kind) continue;
    const explicit = placed.get(f.toLowerCase());
    // The sync step converts HEIC to .jpg and phone video to .mp4 (+ .poster.jpg).
    const webFile = ext === ".heic" || ext === ".heif" ? `${stem}.jpg` : ext === ".mov" || ext === ".m4v" ? `${stem}.mp4` : f;
    if (!fs.existsSync(path.join(PUBLIC, base.dir, webFile))) {
      console.warn(`[materials] ${base.dir}/${f} has no web copy; run "npm run sync" (HEIC/video need a local conversion, cached in _web/).`);
    }
    const poster = kind === "video" && fs.existsSync(path.join(PUBLIC, base.dir, `${stem}.poster.jpg`)) ? `${stem}.poster.jpg` : undefined;
    const media: Media = {
      src: url(webFile),
      caption: explicit?.caption ?? captionFrom(f),
      kind,
      ratio: kind === "image" ? aspect(base.dir, webFile) : poster ? aspect(base.dir, poster) : 16 / 9,
      poster: poster && url(poster),
    };
    if (coverName === f.toLowerCase()) {
      cover = coverCaption ? { ...media, caption: coverCaption } : media;
      continue;
    }
    if (explicit) {
      (placedMedia[explicit.camp] ??= []).push({ media, order: explicit.order });
      continue;
    }
    const camp = campForName(stem);
    if (camp === "cover") cover = media;
    else if (camp) (byCamp[camp] ??= []).push(media);
    else gallery.push(media);
  }

  const camps: CampContent[] = base.camps.map((c) => {
    const section = notes.sections[c.key];
    const parsed = section ? parseBody(section.lines) : null;
    const fromNotes = parsed && (parsed.paragraphs.length || parsed.list.length || parsed.specs.length);
    return {
      ...c,
      label: titleCase(section?.label ?? c.label),
      hidden: !!section && section.lines.filter((l) => l.trim()).map((l) => l.trim().toLowerCase()).join(" ") === "skip",
      pending: !fromNotes && c.body.startsWith("Add "),
      paragraphs: fromNotes ? parsed.paragraphs : [c.body],
      list: fromNotes ? parsed.list : c.list,
      specs: fromNotes ? parsed.specs : [],
      media: [
        ...(placedMedia[c.key] ?? []).sort((a, b) => a.order - b.order).map((x) => x.media),
        ...(byCamp[c.key] ?? []),
      ],
    };
  });

  return {
    ...base,
    title: titleCase(m.title ?? base.title),
    org: m.org ?? base.org,
    role: m.role ?? base.role,
    year: m.year ?? base.year,
    dates: m.dates ?? m.year ?? base.year,
    location: m.location ?? base.location,
    coords: m.coords ?? base.coords,
    tools: m.tools ? m.tools.split(",").map((t) => t.trim()).filter(Boolean) : base.tools,
    summary: summary ?? base.summary,
    draft: base.draft && !hasRealNotes,
    camps,
    cover,
    gallery,
    models: [...models],
    docs,
  };
}

/** Visible projects, in trail order. */
export function getAllProjects(): Project[] {
  return TRAIL.map(getProject);
}

export function getProjectBySlug(slug: string): Project | undefined {
  const base = TRAIL.find((p) => p.slug === slug);
  return base ? getProject(base) : undefined;
}

/** The cropped portrait (see materials/headshot/crop.txt), else the first image in materials/headshot/. */
export function getHeadshot(): string | undefined {
  if (fs.existsSync(path.join(PUBLIC, "headshot", "portrait.jpg"))) return "/materials/headshot/portrait.jpg";
  const dir = path.join(MATERIALS, "headshot");
  const f = listFiles(dir).find((x) => IMAGE.has(path.extname(x).toLowerCase()));
  return f ? `/materials/headshot/${encodeURIComponent(f)}` : undefined;
}

export function hasResume() {
  return fs.existsSync(path.join(MATERIALS, "resume.pdf"));
}
