import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ElevationProfile, type ProfileCamp } from "@/components/ElevationProfile";
import { ModelViewer } from "@/components/ModelViewer";
import { getProjectBySlug, type CampContent, type Media } from "@/lib/materials";
import { CAMP_NAMES, TRAIL, formatFt, waypointMeta } from "@/lib/projects";

export function generateStaticParams() {
  return TRAIL.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = getProjectBySlug(slug);
  return p ? { title: p.title, description: p.summary } : {};
}

const ASCENT = [0, 0.2, 0.38, 0.57, 0.79, 1];
const isDev = process.env.NODE_ENV === "development";

/** One photo with its caption. Clicking opens the full-size file. */
function Figure({ m, n, className = "", style }: { m: Media; n?: string; className?: string; style?: React.CSSProperties }) {
  return (
    <figure className={`min-w-0 ${className}`} style={style}>
      <div className="border border-ink/20 bg-paper-deep/30 p-1.5">
        {m.kind === "video" ? (
          <video src={m.src} poster={m.poster} controls playsInline preload="metadata" className="block w-full" style={{ aspectRatio: m.ratio }} />
        ) : (
          <a href={m.src} target="_blank" rel="noreferrer" className="block cursor-zoom-in" aria-label={`Open full size: ${m.caption || "photo"}`}>
            <img src={m.src} alt={m.caption || "Project photo"} loading="lazy" className="block h-auto w-full" style={{ aspectRatio: m.ratio }} />
          </a>
        )}
      </div>
      {(n || m.caption) && (
        <figcaption className="meta pt-2 text-ink-soft">
          {n && `Fig. ${n}`}
          {n && m.caption ? " · " : ""}
          {m.caption}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Photos in rows of two at a shared height: each photo's width is proportional
 * to its aspect ratio, so nothing is cropped and the row stays compact.
 */
function PhotoRows({ media, prefix }: { media: Media[]; prefix: string }) {
  const rows: Media[][] = [];
  for (let i = 0; i < media.length; i += 2) rows.push(media.slice(i, i + 2));
  return (
    <div className="space-y-5">
      {rows.map((row, r) => (
        <div
          key={r}
          className="flex flex-col gap-4 sm:flex-row"
          // Cap the shared row height at ~420px by limiting the row's width.
          style={{ maxWidth: row.length > 1 ? `${Math.round(row.reduce((a, m) => a + m.ratio, 0) * 420 + 16)}px` : undefined }}
        >
          {row.map((m, i) => (
            <Figure
              key={m.src}
              m={m}
              n={`${prefix}.${r * 2 + i + 1}`}
              className="sm:[flex:var(--row-flex)]"
              style={{ "--row-flex": `${row.length === 1 ? 1 : m.ratio} 1 0%` } as React.CSSProperties}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Pending({ what, folder, hint, className = "min-h-40" }: { what: string; folder: string; hint: string; className?: string }) {
  return (
    <div className={`unsurveyed flex items-end border border-ink/25 p-4 ${className}`}>
      <div className="bg-paper px-3 py-2">
        <p className="meta text-ink-soft">{what} · survey pending</p>
        {isDev && <p className="meta mt-1 text-blaze">Add {hint} to materials/{folder}/</p>}
      </div>
    </div>
  );
}

function CampText({ camp, folder }: { camp: CampContent; folder: string }) {
  return (
    <>
      {camp.pending && (
        <div className="mt-5">
          <Pending what="Field notes" folder={folder} hint={`[${camp.key}] notes in notes.txt (${camp.paragraphs[0]})`} className="min-h-28" />
        </div>
      )}
      <div className="mt-4 max-w-[62ch] space-y-3">
        {!camp.pending && camp.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        {camp.list && camp.list.length > 0 && (
          <ul className="grid gap-x-8 gap-y-1.5 md:grid-cols-2">
            {camp.list.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-contour" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
      {camp.specs.length > 0 && (
        <dl className="mt-5 grid max-w-xl grid-cols-[1fr_auto] border-t border-ink/60">
          {camp.specs.map((s) => (
            <div key={s.label} className="contents">
              <dt className="border-b border-ink/15 py-2 leading-6 text-ink-soft">{s.label}</dt>
              <dd className="meta border-b border-ink/15 py-2 text-right text-[0.85rem] leading-6 text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}

function CampSection({ camp, index, elevation, folder, kind }: { camp: CampContent; index: number; elevation: number; folder: string; kind: string }) {
  const summit = camp.key === "results";
  const needsFigures = kind === "hardware" && (camp.key === "calcs" || camp.key === "analysis") && camp.media.length === 0;
  // One photo sits beside the text; two or more go in rows underneath.
  const beside = camp.media.length === 1;

  const heading = (
    <>
      <p className="meta flex items-center gap-2 text-ink-soft">
        {summit ? (
          <svg viewBox="0 0 14 12" className="h-3 w-3.5" aria-hidden><path d="M7 1 L1 11 L13 11 Z" fill="var(--blaze)" stroke="var(--forest)" /></svg>
        ) : (
          <span aria-hidden className="inline-block h-2 w-2 rounded-full border border-forest" />
        )}
        {CAMP_NAMES[camp.key]} · EL. {formatFt(elevation)} FT
      </p>
      <h2 id={`h-${camp.key}`} className="font-display mt-2 text-3xl text-forest sm:text-4xl">
        {camp.label}
      </h2>
    </>
  );

  return (
    <section id={`camp-${camp.key}`} aria-labelledby={`h-${camp.key}`} className="scroll-mt-8 border-t border-ink/20 pt-6">
      {beside ? (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8">
          <div>
            {heading}
            <CampText camp={camp} folder={folder} />
          </div>
          <Figure
            m={camp.media[0]}
            n={`${index}.1`}
            className={camp.media[0].ratio < 1 ? "mx-auto w-full max-w-[20rem] md:mx-0 md:justify-self-end" : ""}
          />
        </div>
      ) : (
        <>
          {heading}
          <CampText camp={camp} folder={folder} />
          {camp.media.length > 1 && (
            <div className="mt-6">
              <PhotoRows media={camp.media} prefix={String(index)} />
            </div>
          )}
        </>
      )}
      {needsFigures && (
        <div className="mt-6">
          <Pending
            what={camp.key === "analysis" ? "FEA results" : "Hand calculations"}
            folder={folder}
            hint={camp.key === "analysis" ? "fea-*.png" : "hand-calcs-*.jpg"}
            className="min-h-28"
          />
        </div>
      )}
    </section>
  );
}

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const p = getProjectBySlug(slug);
  if (!p) notFound();

  const index = TRAIL.findIndex((x) => x.slug === slug);
  const meta = waypointMeta(index);
  const summitEl = meta.elevation;
  // Base camp sits at about half the summit elevation, so every climb stays above sea level.
  const baseEl = Math.round((summitEl * 0.5) / 10) * 10;
  const camps = p.camps.filter((c) => !c.hidden);
  const fractions = camps.length === ASCENT.length ? ASCENT : camps.map((_, i) => i / Math.max(camps.length - 1, 1));
  const elevations = fractions.map((f) => Math.round((baseEl + (summitEl - baseEl) * f) / 10) * 10);
  const profile: ProfileCamp[] = camps.map((c, i) => ({
    id: `camp-${c.key}`,
    name: CAMP_NAMES[c.key],
    label: c.label,
    elevation: elevations[i],
  }));
  // Title from notes.txt, not the base data.
  const next = getProjectBySlug(TRAIL[(index + 1) % TRAIL.length].slug)!;

  const hardware = p.kind === "hardware";
  // The finished product leads. Hardware without a photo yet falls back to the CAD viewer.
  const leadWithModel = hardware && !p.cover;
  const showModelBand = hardware && !!p.cover && p.models.length > 0;

  return (
    <article className="mx-auto max-w-6xl px-4 sm:px-8">
      <header className="pt-10 sm:pt-12">
        <Link href="/projects" className="link meta text-ink-soft">Back to the trail</Link>
        {isDev && p.draft && (
          <p className="meta mt-4 block w-fit border border-blaze px-2 py-1 text-blaze">
            Placeholder copy. Write notes in materials/{p.dir}/notes.txt
          </p>
        )}

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
          <div>
            <p className="meta text-ink-soft">
              WPT {meta.wpt} · EL. {formatFt(meta.elevation)} FT · {p.title.toUpperCase()}
            </p>
            <h1 className="font-display mt-3 text-[clamp(2.6rem,6vw,4.5rem)] text-forest">{p.title}</h1>
            <p className="mt-5 max-w-[52ch] text-lg">{p.summary}</p>
            <dl className="mt-6 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5 border-t border-ink/60 pt-4 text-[0.95rem]">
              <dt className="text-ink-soft">Team</dt>
              <dd>{p.org}</dd>
              <dt className="text-ink-soft">Role</dt>
              <dd>{p.role}</dd>
              <dt className="text-ink-soft">When</dt>
              <dd>
                {p.dates}
                {p.location !== "—" && <span className="text-ink-soft">, {p.location}</span>}
              </dd>
              {p.tools.length > 0 && (
                <>
                  <dt className="text-ink-soft">Tools</dt>
                  <dd>{p.tools.join(", ")}</dd>
                </>
              )}
            </dl>
            {p.docs.length > 0 && (
              <ul className="mt-5 space-y-1">
                {p.docs.map((d) => (
                  <li key={d.href}>
                    <a href={d.href} target="_blank" rel="noreferrer" className="link font-medium text-forest">
                      Open {d.name} (PDF)
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            {leadWithModel ? (
              <ModelViewer models={p.models} title={p.title} folder={p.dir} />
            ) : p.cover ? (
              <Figure
                m={p.cover}
                // Portrait covers are capped at ~34rem tall so the first screen still reads as a whole.
                className={p.cover.ratio < 1 ? "mx-auto lg:mr-0" : ""}
                style={p.cover.ratio < 1 ? { maxWidth: `${Math.min(26, 34 * p.cover.ratio).toFixed(1)}rem` } : undefined}
              />
            ) : (
              <Pending what="Photo" folder={p.dir} hint="cover.jpg" className="aspect-[4/3]" />
            )}
          </div>
        </div>
      </header>

      {showModelBand && (
        <section aria-labelledby="h-model" className="mt-12 grid gap-6 border-t border-ink/20 pt-6 lg:grid-cols-[14rem_1fr] lg:gap-16">
          <div>
            <p className="meta text-ink-soft">CAD model</p>
            <h2 id="h-model" className="font-display mt-2 text-3xl text-forest">Explore in 3D</h2>
          </div>
          <ModelViewer models={p.models} title={p.title} folder={p.dir} short />
        </section>
      )}

      <div className="mt-14 grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-16">
        <aside>
          <ElevationProfile camps={profile} />
        </aside>
        <div className="space-y-12">
          {camps.map((c, i) => (
            <CampSection key={c.key} camp={c} index={i + 1} elevation={elevations[i]} folder={p.dir} kind={p.kind} />
          ))}

          {p.gallery.length > 0 && (
            <section aria-labelledby="h-gallery" className="border-t border-ink/20 pt-6">
              <h2 id="h-gallery" className="font-display text-3xl text-forest sm:text-4xl">Field Photos</h2>
              <div className="mt-5">
                <PhotoRows media={p.gallery} prefix="7" />
              </div>
            </section>
          )}
        </div>
      </div>

      <nav aria-label="Next project" className="mt-20 border-t-2 border-ink/80 pt-6">
        <p className="meta text-ink-soft">Continue on the trail</p>
        <Link href={`/projects/${next.slug}`} className="font-display mt-2 inline-block text-4xl text-forest hover:text-ink sm:text-5xl">
          {next.title}
        </Link>
      </nav>
    </article>
  );
}
