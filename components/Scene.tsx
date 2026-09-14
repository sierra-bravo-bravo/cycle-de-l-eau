"use client";

import { useMemo } from "react";
import { depth } from "@/lib/iso";
import { toFaces, type Face } from "@/lib/solids";
import { LANDSCAPE, NETWORK, STATIONS } from "@/content/plan";

/**
 * Rendu SVG de la scène.
 *
 * Les stations ne s'interpénètrent pas, on peut donc trier les faces à
 * l'intérieur de chaque station et ordonner les stations entre elles par
 * profondeur. Cela préserve des groupes DOM stables, indispensables pour
 * estomper une station entière sans artefact de transparence entre ses faces.
 */

function Faces({ faces }: { faces: Face[] }) {
  return (
    <>
      {faces.map((f, i) =>
        f.type === "fill" ? (
          <path key={i} d={f.d} fill={f.fill} />
        ) : (
          <path
            key={i}
            d={f.d}
            fill="none"
            stroke={f.stroke}
            strokeWidth={f.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={f.flow ? "flow" : undefined}
          />
        ),
      )}
    </>
  );
}

export default function Scene({ sceneRef }: { sceneRef: React.Ref<SVGGElement> }) {
  const layers = useMemo(() => {
    const ordered = [...STATIONS].sort(
      (a, b) => depth(a.origin.u, a.origin.v) - depth(b.origin.u, b.origin.v),
    );
    return {
      landscape: toFaces(LANDSCAPE),
      network: toFaces(NETWORK),
      stations: ordered.map((s) => ({ id: s.id, faces: toFaces(s.solids) })),
    };
  }, []);

  return (
    <g ref={sceneRef}>
      <g className="layer">
        <Faces faces={layers.landscape} />
      </g>
      <g className="layer" data-part="network">
        <Faces faces={layers.network} />
      </g>
      {layers.stations.map((s) => (
        <g key={s.id} className="layer" data-part={s.id}>
          <Faces faces={s.faces} />
        </g>
      ))}
    </g>
  );
}
