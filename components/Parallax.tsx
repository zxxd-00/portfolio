"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Moves every descendant with a `data-depth` attribute against the pointer.
 * Depth is in SVG user units at full deflection. Eased with a lerp so motion
 * stays smooth; disabled for reduced-motion and coarse pointers.
 */
export function Parallax({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const layers = Array.from(root.querySelectorAll<SVGGElement>("[data-depth]")).map((el) => ({
      el,
      depth: Number(el.dataset.depth),
    }));
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      for (const { el, depth } of layers) {
        el.setAttribute("transform", `translate(${(-x * depth).toFixed(2)} ${(-y * depth * 0.45).toFixed(2)})`);
      }
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.0005 ? requestAnimationFrame(tick) : 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
