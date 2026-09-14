"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { cam } from "@/lib/camera";
import { clamp, fromScreen } from "@/lib/iso";

const noSubscribe = () => () => {};
const isDev = () => new URLSearchParams(window.location.search).has("dev");

/**
 * Outil de cadrage, activé par `?dev` dans l'URL.
 *
 * Régler à la main les coordonnées de huit chapitres coûte des heures. Ici on
 * cadre à la souris — glisser pour déplacer, molette pour zoomer — puis on
 * copie la valeur prête à coller dans `content/chapters.ts`.
 */
export default function DevCamera() {
  const on = useSyncExternalStore(noSubscribe, isDev, () => false);
  const [readout, setReadout] = useState({ u: 0, v: 0, zoom: 1 });
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
      const d = fromScreen(-e.movementX / cam.zoom, -e.movementY / cam.zoom);
      cam.u += d.u;
      cam.v += d.v;
    };
    const wheel = (e: WheelEvent) => {
      if (!e.altKey) return; // Alt + molette, pour ne pas confisquer le scroll
      e.preventDefault();
      cam.zoom = clamp(cam.zoom * (e.deltaY > 0 ? 0.94 : 1.06), 0.15, 6);
    };

    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointermove", move);
    window.addEventListener("wheel", wheel, { passive: false });
    const tick = setInterval(
      () => setReadout({ u: cam.u, v: cam.v, zoom: cam.zoom }),
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

  const snippet = `{ u: ${readout.u.toFixed(1)}, v: ${readout.v.toFixed(1)}, zoom: ${readout.zoom.toFixed(2)} }`;

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
      <span className="devhint">glisser : déplacer · alt + molette : zoomer</span>
    </div>
  );
}
