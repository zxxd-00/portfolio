import Link from "next/link";
import { Hero } from "@/components/Hero";
import { getAllProjects, getHeadshot } from "@/lib/materials";
import { formatFt, waypointMeta } from "@/lib/projects";


export default function Home() {
  const projects = getAllProjects();
  const headshot = getHeadshot();
  const featured = projects.map((project, i) => ({ project, meta: waypointMeta(i) }));

  return (
    <>
      <Hero />

      <section aria-labelledby="about" className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-8 md:grid-cols-[1fr_2fr]">
        <div>
          <h2 id="about" className="font-display text-4xl text-forest sm:text-5xl">
            About the Surveyor
          </h2>
          <figure className="mt-8 max-w-[18rem]">
            {headshot ? (
              <img
                src={headshot}
                alt="Zaid Adassi"
                className="aspect-[4/5] w-full border border-ink/25 object-cover p-1.5"
              />
            ) : (
              <div className="unsurveyed flex aspect-[4/5] w-full items-end border border-ink/25 p-4">
                <p className="meta bg-paper px-2 py-1 text-ink-soft">
                  Portrait · survey pending
                  {process.env.NODE_ENV === "development" && (
                    <span className="block text-blaze">Add a photo to materials/headshot/</span>
                  )}
                </p>
              </div>
            )}
            <figcaption className="meta mt-2 text-ink-soft">Z. Adassi</figcaption>
          </figure>
        </div>
        <div className="max-w-[62ch] space-y-5 text-lg md:pt-[4.6rem]">
          <p>
            Hi, I&rsquo;m Zaid, a mechanical engineering student at UC Berkeley. I love building physical things and
            seeing a project through from first idea to finished product: design, analysis, testing, and manufacturing.
            Below are some of my favorite projects, each one a real problem I got to design, build, and test a solution
            for.
          </p>
          <p>
            On Berkeley Formula Racing I design suspension components and the system that measures their loads on track.
            I&rsquo;ve done NSF-funded research on mycelium biomaterials at the University of Kentucky and on computer
            vision for transportation at Iowa State, and built an AI wearable for technicians at a YC hackathon.
          </p>
          <p>
            <Link href="/projects" className="link font-medium text-forest">Walk the full trail</Link>
            <span className="text-ink-soft"> or </span>
            <Link href="/resume" className="link font-medium text-forest">download my resume</Link>.
          </p>
        </div>
      </section>

      <section aria-labelledby="featured" className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink/80 pb-4">
          <h2 id="featured" className="font-display text-4xl text-forest sm:text-5xl">
            Featured Waypoints
          </h2>
          <Link
            href="/projects"
            className="inline-flex items-center gap-3 border-[1.5px] border-forest bg-forest px-5 py-2.5 font-medium text-paper transition-colors hover:border-ink hover:bg-ink"
          >
            <span aria-hidden className="h-4 w-2.5 border border-paper bg-blaze" />
            See all projects
          </Link>
        </div>
        <ol>
          {featured.map(({ project: p, meta }) => (
            <li key={p.slug} className="border-b border-ink/15">
              <Link
                href={`/projects/${p.slug}`}
                className="group grid gap-x-8 gap-y-2 py-7 md:grid-cols-[7rem_1fr_14rem] md:items-baseline"
              >
                <span className="meta flex items-center gap-3 text-ink-soft">
                  <span aria-hidden className="h-4 w-2.5 border-[1.5px] border-blaze bg-paper transition-colors group-hover:border-ink group-hover:bg-blaze" />
                  WPT {meta.wpt}
                </span>
                <span>
                  <span className="font-display block text-3xl text-forest group-hover:text-ink sm:text-4xl">{p.title}</span>
                  <span className="mt-2 block max-w-[60ch] text-ink-soft">{p.summary}</span>
                </span>
                <span className="meta text-ink-soft md:text-right">
                  {p.org}
                  <br />
                  EL. {formatFt(meta.elevation)} FT
                  <br />
                  {p.coords}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
