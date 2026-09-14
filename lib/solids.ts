/**
 * Primitives volumiques et leur conversion en faces SVG.
 *
 * Chaque primitive est décrite en coordonnées monde `(u, v, h)`. Le rendu SVG
 * en tire des faces projetées et ombrées ; le rendu Three.js de la phase B
 * consommera exactement les mêmes primitives sous forme de `BoxGeometry`,
 * `CylinderGeometry` et `TubeGeometry`. C'est le décor et le modèle 3D à la fois.
 */

import { depth, project, toPath, type Point, type Vec2, type Vec3 } from "./iso";

export const PALETTE = {
  shell: "#ffffff",
  concrete: "#e6ecf5",
  steel: "#cbd6e6",
  blue: "#2f6fe4",
  deep: "#22438c",
  navy: "#16264d",
  cyan: "#4cc7e8",
  water: "#31b4e6",
  raw: "#2ec9a8",
  rawSoft: "#8fdfcb",
  waterSoft: "#a4d9f2",
  soil: "#dde5f0",
  grass: "#e9f6f1",
  accent: "#0f7ad6",
} as const;

export type Tone = keyof typeof PALETTE;

type Base = { tone: Tone; z?: number };

export type Solid =
  | ({ kind: "box"; u: number; v: number; h?: number; w: number; d: number; ht: number } & Base)
  | ({ kind: "cyl"; u: number; v: number; h?: number; r: number; rTop?: number; ht: number; sides?: number; rot?: number } & Base)
  | ({ kind: "slab"; u: number; v: number; h?: number; w: number; d: number } & Base)
  | ({ kind: "poly"; points: Vec2[]; h?: number } & Base)
  | ({ kind: "pipe"; path: Vec3[]; width?: number; flow?: boolean } & Base);

export type Face =
  | { type: "fill"; d: string; fill: string; z: number }
  | { type: "stroke"; d: string; stroke: string; width: number; z: number; flow?: boolean };

const TOP = 1;
const RIGHT = 0.87;
const LEFT = 0.71;

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(Math.min(255, c * k + 255 * (1 - k) * 0.06));
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

const quad = (a: Point, b: Point, c: Point, e: Point) => toPath([a, b, c, e]);

function boxFaces(s: Extract<Solid, { kind: "box" }>): Face[] {
  const { u, v, w, d, ht, tone } = s;
  const h = s.h ?? 0;
  const base = PALETTE[tone];
  const z = s.z ?? depth(u + w / 2, v + d / 2, h + ht / 2);
  const p = (uu: number, vv: number, hh: number) => project(uu, vv, hh);

  return [
    {
      type: "fill",
      d: quad(p(u, v + d, h), p(u + w, v + d, h), p(u + w, v + d, h + ht), p(u, v + d, h + ht)),
      fill: shade(base, LEFT),
      z,
    },
    {
      type: "fill",
      d: quad(p(u + w, v, h), p(u + w, v + d, h), p(u + w, v + d, h + ht), p(u + w, v, h + ht)),
      fill: shade(base, RIGHT),
      z,
    },
    {
      type: "fill",
      d: quad(p(u, v, h + ht), p(u + w, v, h + ht), p(u + w, v + d, h + ht), p(u, v + d, h + ht)),
      fill: shade(base, TOP),
      z,
    },
  ];
}

function cylFaces(s: Extract<Solid, { kind: "cyl" }>): Face[] {
  const { u, v, r, ht, tone } = s;
  const h = s.h ?? 0;
  const rTop = s.rTop ?? r;
  const sides = s.sides ?? 18;
  const rot = s.rot ?? 0;
  const base = PALETTE[tone];
  const z = s.z ?? depth(u, v, h + ht / 2);
  const faces: Face[] = [];

  for (let i = 0; i < sides; i++) {
    const a0 = rot + (i / sides) * Math.PI * 2;
    const a1 = rot + ((i + 1) / sides) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const nu = Math.cos(am);
    const nv = Math.sin(am);
    if (nu + nv <= 0) continue; // face détournée de la caméra

    // Éclairage doux venant du haut-droite, comme la référence Hut 8.
    const k = LEFT + (RIGHT - LEFT + 0.08) * ((nu * 0.82 - nv * 0.57 + 1) / 2);
    faces.push({
      type: "fill",
      d: quad(
        project(u + r * Math.cos(a0), v + r * Math.sin(a0), h),
        project(u + r * Math.cos(a1), v + r * Math.sin(a1), h),
        project(u + rTop * Math.cos(a1), v + rTop * Math.sin(a1), h + ht),
        project(u + rTop * Math.cos(a0), v + rTop * Math.sin(a0), h + ht),
      ),
      fill: shade(base, k),
      z,
    });
  }

  if (rTop > 0) {
    const cap: Point[] = [];
    for (let i = 0; i < sides; i++) {
      const a = rot + (i / sides) * Math.PI * 2;
      cap.push(project(u + rTop * Math.cos(a), v + rTop * Math.sin(a), h + ht));
    }
    faces.push({ type: "fill", d: toPath(cap), fill: shade(base, TOP), z });
  }
  return faces;
}

function flatFaces(points: Vec2[], h: number, tone: Tone, z?: number): Face[] {
  return [
    {
      type: "fill",
      d: toPath(points.map((pt) => project(pt.u, pt.v, h))),
      fill: shade(PALETTE[tone], TOP),
      z: z ?? -Infinity,
    },
  ];
}

function pipeFaces(s: Extract<Solid, { kind: "pipe" }>): Face[] {
  const width = s.width ?? 3.2;
  const d = toPath(s.path.map((pt) => project(pt.u, pt.v, pt.h)), false);
  const z = s.z ?? Math.max(...s.path.map((pt) => depth(pt.u, pt.v, pt.h)));
  const base = PALETTE[s.tone];
  const faces: Face[] = [
    { type: "stroke", d, stroke: shade(base, LEFT), width, z },
    { type: "stroke", d, stroke: shade(base, TOP), width: width * 0.42, z },
  ];
  // Le flux remplace les flèches directionnelles du schéma d'origine.
  if (s.flow) faces.push({ type: "stroke", d, stroke: "#ffffff", width: width * 0.42, z, flow: true });
  return faces;
}

export function toFaces(solids: Solid[]): Face[] {
  const faces: Face[] = [];
  for (const s of solids) {
    switch (s.kind) {
      case "box":
        faces.push(...boxFaces(s));
        break;
      case "cyl":
        faces.push(...cylFaces(s));
        break;
      case "slab":
        faces.push(
          ...flatFaces(
            [
              { u: s.u, v: s.v },
              { u: s.u + s.w, v: s.v },
              { u: s.u + s.w, v: s.v + s.d },
              { u: s.u, v: s.v + s.d },
            ],
            s.h ?? 0,
            s.tone,
            s.z,
          ),
        );
        break;
      case "poly":
        faces.push(...flatFaces(s.points, s.h ?? 0, s.tone, s.z));
        break;
      case "pipe":
        faces.push(...pipeFaces(s));
        break;
    }
  }
  // Algorithme du peintre : du fond vers l'avant. Le tri est stable, donc les
  // faces d'un même solide gardent leur ordre d'émission.
  return faces.sort((a, b) => a.z - b.z);
}

/* ---------------------------------------------------------------------------
 * Aides à l'écriture du décor : construire en repère local puis translater.
 * ------------------------------------------------------------------------- */

export function translate(solids: Solid[], du: number, dv: number): Solid[] {
  return solids.map((s) => {
    switch (s.kind) {
      case "box":
      case "slab":
      case "cyl":
        return { ...s, u: s.u + du, v: s.v + dv };
      case "poly":
        return { ...s, points: s.points.map((p) => ({ u: p.u + du, v: p.v + dv })) };
      case "pipe":
        return { ...s, path: s.path.map((p) => ({ ...p, u: p.u + du, v: p.v + dv })) };
    }
  });
}
