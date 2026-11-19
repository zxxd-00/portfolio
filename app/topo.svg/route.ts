import { heroFieldSvg } from "@/lib/heroTerrain";

export const dynamic = "force-static";

/** The hero's contour field, generated once at build time and cached as a static file. */
export function GET() {
  return new Response(heroFieldSvg(), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
