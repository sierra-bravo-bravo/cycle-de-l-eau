/**
 * État de caméra partagé, muté à 60 fps hors du cycle de rendu React.
 *
 * `u` et `v` désignent le point du sol centré à l'écran, `zoom` le facteur
 * d'échelle. Ces trois valeurs suffisent à décrire un cadrage isométrique :
 * l'orientation est figée, ce qui rend impossible de casser la perspective.
 * Le rendu Three.js de la phase B consommera le même objet.
 */

import type { Point } from "./iso";
import { project } from "./iso";

export type Cam = { u: number; v: number; zoom: number };

export const cam: Cam = { u: 0, v: 0, zoom: 0.52 };

/**
 * `fit` adapte les cadrages, calibrés pour un écran large, aux fenêtres plus
 * étroites. Il est appliqué au rendu et non dans la timeline, pour qu'un
 * redimensionnement en cours de parcours soit pris en compte immédiatement.
 */
export const viewport = { w: 1440, h: 900, fit: 1 };

const scale = () => cam.zoom * viewport.fit;

/** Coordonnées monde `(u, v, h)` → pixels écran, au cadrage courant. */
export function toScreen(u: number, v: number, h = 0): Point {
  const p = project(u, v, h);
  const c = project(cam.u, cam.v, 0);
  const z = scale();
  return {
    x: viewport.w / 2 + (p.x - c.x) * z,
    y: viewport.h / 2 + (p.y - c.y) * z,
  };
}

/** Transformation SVG équivalente, appliquée au groupe racine de la scène. */
export function sceneTransform(): string {
  const c = project(cam.u, cam.v, 0);
  return `scale(${scale().toFixed(4)}) translate(${(-c.x).toFixed(2)} ${(-c.y).toFixed(2)})`;
}
