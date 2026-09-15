"use client";

import { useEffect, useRef, useState } from "react";
import {
  clampedCenter,
  halfSpan,
  view,
  viewport,
} from "@/lib/camera";
import { asset } from "@/lib/asset";
import {
  createRenderer,
  loadImage,
  pickWidth,
  type WaterRenderer,
} from "@/lib/waterGL";

/**
 * Canvas WebGL de la scène.
 *
 * Lit `view` à chaque frame : GSAP mute le cadrage et le front d'eau, le
 * shader substitue le visuel rempli au visuel à vide le long du réseau.
 */
export default function Scene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: WaterRenderer | null = null;
    let raf = 0;
    let start = 0;
    let cancelled = false;

    const draw = (now: number) => {
      if (!renderer) return;
      if (!start) start = now;
      const c = clampedCenter();
      const h = halfSpan();
      renderer.draw({
        centerX: c.x,
        centerY: c.y,
        halfX: h.x,
        halfY: h.y,
        progress: view.flow,
        time: reduced ? 0 : (now - start) / 1000,
        resX: viewport.w,
        resY: viewport.h,
        fadePx: 80,
      });
      raf = requestAnimationFrame(draw);
    };

    const resize = () => {
      viewport.w = window.innerWidth;
      viewport.h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer?.resize(viewport.w, viewport.h, dpr);
    };

    (async () => {
      try {
        const w = pickWidth();
        const [dry, wet, flow] = await Promise.all([
          loadImage(asset(`/scene/dry-${w}.webp?v=35`)),
          loadImage(asset(`/scene/wet-${w}.webp?v=35`)),
          loadImage(asset("/scene/flow.png?v=35")),
        ]);
        if (cancelled) return;
        renderer = createRenderer(canvas, { dry, wet, flow });
        resize();
        setStatus("ready");
        raf = requestAnimationFrame(draw);
      } catch (err) {
        console.error(err);
        if (!cancelled) setStatus("error");
      }
    })();

    window.addEventListener("resize", resize);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      renderer?.dispose();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="canvas" aria-hidden="true" />
      {status === "loading" && (
        <p className="loader" role="status">
          Chargement de la scène
        </p>
      )}
      {status === "error" && (
        <p className="loader" role="alert">
          Impossible de charger le visuel
        </p>
      )}
    </>
  );
}
