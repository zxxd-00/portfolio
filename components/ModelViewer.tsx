"use client";
import { useEffect, useState, type DetailedHTMLProps, type HTMLAttributes } from "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, unknown>;
    }
  }
}

function nameFrom(src: string) {
  return decodeURIComponent(src.split("/").pop() ?? "").replace(/\.glb$/i, "").replace(/[-_]+/g, " ");
}

export function ModelViewer({ models, title, folder, short = false }: { models: string[]; title: string; folder: string; short?: boolean }) {
  const frame = short ? "aspect-[4/3] sm:aspect-[16/7]" : "aspect-[4/3] sm:aspect-[16/10]";
  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!models.length) return;
    import("@google/model-viewer").then(() => setReady(true));
  }, [models.length]);

  if (!models.length) {
    return (
      <div className={`unsurveyed relative flex ${frame} w-full items-end border border-ink/25 p-5`}>
        <div className="bg-paper px-3 py-2">
          <p className="meta text-ink-soft">3D model · survey pending</p>
          {process.env.NODE_ENV === "development" && (
            <p className="meta mt-1 text-blaze">Drop an .stl or .glb into materials/{folder}/</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <figure>
      <div className={`relative ${frame} w-full border border-ink/25 bg-paper-deep/40`}>
        {ready && (
          <model-viewer
            key={models[current]}
            src={models[current]}
            alt={`3D model of the ${title}`}
            camera-controls=""
            auto-rotate=""
            auto-rotate-delay="1500"
            rotation-per-second="18deg"
            interaction-prompt="none"
            shadow-intensity="0.6"
            shadow-softness="0.9"
            exposure="1.05"
            environment-image="neutral"
            camera-orbit="35deg 70deg auto"
            style={{ width: "100%", height: "100%", background: "transparent" }}
          />
        )}
        {!ready && <div className="meta absolute inset-0 grid place-items-center text-ink-soft">Loading model</div>}
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="meta text-ink-soft">Drag to orbit, scroll or pinch to zoom</span>
        {models.length > 1 && (
          <span className="flex flex-wrap gap-2" role="group" aria-label="Choose model">
            {models.map((m, i) => (
              <button
                key={m}
                type="button"
                onClick={() => setCurrent(i)}
                aria-pressed={i === current}
                className={`meta border px-2 py-1 capitalize transition-colors ${
                  i === current ? "border-forest bg-forest text-paper" : "border-ink/30 text-ink hover:border-forest"
                }`}
              >
                {nameFrom(m)}
              </button>
            ))}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
