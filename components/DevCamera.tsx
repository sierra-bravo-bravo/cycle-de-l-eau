"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { clamp, halfSpan, view, viewport } from "@/lib/camera";

const noSubscribe = () => () => {};
const isDev = () => new URLSearchParams(window.location.search).has("dev");

/**
 * Outil de cadrage, activé par `?dev` dans l'URL.
 *
 * Glisser pour déplacer, alt + molette pour zoomer, shift + molette pour
 * avancer le front d'eau. Le triplet copié se colle dans `content/chapters.ts`.
 */
export default function DevCamera() {
  const on = useSyncExternalStore(noSubscribe, isDev, () => false);
  const [readout, setReadout] = useState({ x: 0.5, y: 0.5, zoom: 1, flow: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!on) return;

    let dragging = false;
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest(".devpanel")) return;
      dragging = true;
    };
    const up = () => {
      dragging = false;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const h = halfSpan();
      view.x -= (e.movementX / viewport.w) * 2 * h.x;
      view.y -= (e.movementY / viewport.h) * 2 * h.y;
    };
    const wheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        view.flow = clamp(view.flow + (e.deltaY > 0 ? -0.02 : 0.02), 0, 1);
        return;
      }
      if (!e.altKey) return;
      e.preventDefault();
      view.zoom = clamp(view.zoom * (e.deltaY > 0 ? 0.94 : 1.06), 0.5, 6);
    };

    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointermove", move);
    window.addEventListener("wheel", wheel, { passive: false });
    const tick = setInterval(
      () => setReadout({ x: view.x, y: view.y, zoom: view.zoom, flow: view.flow }),
      120,
    );

    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("wheel", wheel);
      clearInterval(tick);
    };
  }, [on]);

  if (!on) return null;

  const snippet = `{ x: ${readout.x.toFixed(3)}, y: ${readout.y.toFixed(3)}, zoom: ${readout.zoom.toFixed(2)}, flow: ${readout.flow.toFixed(2)} }`;

  return (
    <div className="devpanel">
      <code>{snippet}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(snippet);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? "Copié" : "Copier le cadrage"}
      </button>
      <span className="devhint">glisser · alt+molette zoom · shift+molette eau</span>
    </div>
  );
}
