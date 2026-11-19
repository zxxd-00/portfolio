import type { Metadata } from "next";
import { RouteOverview } from "@/components/RouteOverview";
import { TrailMap, type Waypoint } from "@/components/TrailMap";
import { getAllProjects } from "@/lib/materials";
import { formatFt, waypointMeta } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "Seven engineering projects: Formula SAE suspension, data acquisition, wearables and NSF-funded research.",
};

export default function ProjectsPage() {
  const projects = getAllProjects();
  const waypoints: Waypoint[] = projects.map((p, i) => {
    const m = waypointMeta(i);
    return {
      slug: p.slug,
      wpt: m.wpt,
      elevation: formatFt(m.elevation),
      title: p.title,
      org: p.org,
      dates: p.dates,
      role: p.role,
      summary: p.summary,
      coords: p.coords,
      // Video covers show their poster frame as the thumbnail.
      cover: p.cover ? (p.cover.kind === "video" ? p.cover.poster : p.cover.src) : undefined,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8">
      <header className="max-w-3xl pt-16 sm:pt-24">
        <p className="meta text-ink-soft">Trailhead · {projects.length} waypoints · descending</p>
        <h1 className="font-display mt-4 text-[clamp(3rem,9vw,6.5rem)] text-forest">Projects</h1>
      </header>
      <RouteOverview stops={waypoints.map(({ slug, wpt, title, dates, org }) => ({ slug, wpt, title, dates, org }))} />
      <TrailMap waypoints={waypoints} />
    </div>
  );
}
