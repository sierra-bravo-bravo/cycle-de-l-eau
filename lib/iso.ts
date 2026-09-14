/**
 * Repère commun aux deux moteurs de rendu.
 *
 * Le monde est décrit en coordonnées `(u, v, h)` : `u` et `v` sont les deux axes
 * du plan au sol, `h` l'élévation. Le rendu SVG les projette avec `project()` ;
 * le futur rendu Three.js les lira directement comme positions monde
 * `(u, h, v)` sous une caméra orthographique orientée aux mêmes angles.
 * Les cadrages définis dans `content/chapters.ts` sont donc valables pour les deux.
 */

export const ISO_COS = Math.cos(Math.PI / 6);
export const ISO_SIN = Math.sin(Math.PI / 6);

export type Vec3 = { u: number; v: number; h: number };
export type Vec2 = { u: number; v: number };
export type Point = { x: number; y: number };

export function project(u: number, v: number, h = 0): Point {
  return { x: (u - v) * ISO_COS, y: (u + v) * ISO_SIN - h };
}

export function projectVec({ u, v, h }: Vec3): Point {
  return project(u, v, h);
}

/**
 * Inverse de `project` au niveau du sol. Sert uniquement à l'écriture du décor :
 * on relève une position sur l'illustration de référence et on obtient les
 * coordonnées monde correspondantes.
 */
export function fromScreen(x: number, y: number): Vec2 {
  const a = x / ISO_COS;
  const b = y / ISO_SIN;
  return { u: (b + a) / 2, v: (b - a) / 2 };
}

/**
 * Distance à la caméra isométrique, qui regarde la scène depuis (+u, +v, +h).
 * Plus la valeur est grande, plus l'objet est au premier plan.
 */
export function depth(u: number, v: number, h = 0): number {
  return u + v + h;
}

export function toPath(points: Point[], close = true): string {
  if (points.length === 0) return "";
  const [head, ...rest] = points;
  const body = rest.map((p) => `L${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join("");
  return `M${head.x.toFixed(2)} ${head.y.toFixed(2)}${body}${close ? "Z" : ""}`;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
