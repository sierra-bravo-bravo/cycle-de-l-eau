/**
 * Reconstruction du schéma du cycle de l'eau en primitives isométriques.
 *
 * Les origines des stations sont relevées sur l'illustration de référence via
 * `at()`, qui convertit une position écran en coordonnées monde. Le contenu de
 * chaque station est ensuite modelé en volumes, dans un repère local, puis
 * translaté. Ce fichier est le seul décrivant le décor : le rendu SVG et le
 * futur rendu Three.js le consomment tel quel.
 */

import { fromScreen, type Vec2, type Vec3 } from "@/lib/iso";
import { translate, type Solid, type Tone } from "@/lib/solids";

/** Échelle entre l'illustration de référence (1024 × 582) et le monde. */
const S = 1.75;

/** Position écran sur l'illustration (origine au centre) → coordonnées monde. */
const at = (x: number, y: number): Vec2 => fromScreen(x * S, y * S);

/* -- Raccourcis d'écriture : les boîtes sont centrées, c'est plus lisible. -- */

const bx = (u: number, v: number, w: number, d: number, ht: number, tone: Tone, h = 0): Solid => ({
  kind: "box",
  u: u - w / 2,
  v: v - d / 2,
  w,
  d,
  ht,
  tone,
  h,
});

const cy = (
  u: number,
  v: number,
  r: number,
  ht: number,
  tone: Tone,
  extra: { h?: number; rTop?: number; sides?: number; rot?: number } = {},
): Solid => ({ kind: "cyl", u, v, r, ht, tone, ...extra });

/** Toit à quatre pans : un cylindre à 4 côtés dont le sommet est un point. */
const roof = (u: number, v: number, half: number, ht: number, h: number, tone: Tone = "deep"): Solid =>
  cy(u, v, half * Math.SQRT2, ht, tone, { rTop: 0, sides: 4, rot: Math.PI / 4, h });

const pad = (u: number, v: number, w: number, d: number, tone: Tone = "concrete"): Solid => ({
  kind: "slab",
  u: u - w / 2,
  v: v - d / 2,
  w,
  d,
  tone,
  h: 0.4,
});

const pipe = (path: Vec3[], width = 3.4, tone: Tone = "blue", flow = true): Solid => ({
  kind: "pipe",
  path,
  width,
  tone,
  flow,
});

/* ------------------------------ Les stations ------------------------------ */

export type Station = {
  id: string;
  origin: Vec2;
  solids: Solid[];
};

function station(id: string, refX: number, refY: number, solids: Solid[]): Station {
  const origin = at(refX, refY);
  return { id, origin, solids: translate(solids, origin.u, origin.v) };
}

/** 1 — Captage et stockage d'eau brute : prise d'eau et bassin de stockage. */
const captage = station("captage", -182, -206, [
  pad(0, 0, 140, 120),
  { kind: "slab", u: -58, v: -42, w: 74, d: 64, tone: "steel", h: 0.9 },
  { kind: "slab", u: -54, v: -38, w: 66, d: 56, tone: "raw", h: 1.6 },
  bx(40, 26, 34, 28, 16, "shell"),
  roof(40, 26, 19, 9, 16),
  cy(18, -40, 7, 13, "steel"),
  cy(34, -40, 7, 13, "steel"),
  bx(26, -40, 26, 4, 3, "blue", 13),
]);

/** 2 — Production d'eau potable : usine de traitement et filtres. */
const production = station("production", -332, -76, [
  pad(0, 0, 160, 130),
  bx(0, 6, 86, 58, 20, "shell"),
  ...Array.from({ length: 7 }, (_, i) => bx(-36 + i * 12, 6, 7, 60, 2.6, "blue", 20)),
  cy(-26, -44, 9, 17, "steel"),
  cy(0, -44, 9, 17, "steel"),
  cy(26, -44, 9, 17, "steel"),
  bx(-52, 46, 24, 22, 14, "shell"),
  roof(-52, 46, 13, 7, 14),
]);

/** 3 — Distribution d'eau potable : château d'eau, réseau enterré, chantier. */
const distribution = station("distribution", -212, 40, [
  pad(-14, -8, 170, 155),
  // Château d'eau
  bx(-26, -20, 5, 5, 46, "steel"),
  bx(-2, -20, 5, 5, 46, "steel"),
  bx(-26, 4, 5, 5, 46, "steel"),
  bx(-2, 4, 5, 5, 46, "steel"),
  cy(-14, -8, 4, 46, "steel"),
  cy(-14, -8, 26, 22, "shell", { h: 46 }),
  cy(-14, -8, 26.6, 3, "accent", { h: 50 }),
  cy(-14, -8, 26, 11, "deep", { rTop: 5, h: 68 }),
  // Tranchée et stock de canalisations
  { kind: "slab", u: 18, v: 10, w: 66, d: 16, tone: "soil", h: 0.8 },
  pipe([{ u: 20, v: 18, h: 1.5 }, { u: 82, v: 18, h: 1.5 }], 5.5, "blue", false),
  pipe([{ u: 22, v: 40, h: 2 }, { u: 78, v: 40, h: 2 }], 5.5, "cyan", false),
  pipe([{ u: 22, v: 50, h: 2 }, { u: 78, v: 50, h: 2 }], 5.5, "cyan", false),
  // Camion citerne
  bx(-6, 62, 30, 13, 12, "shell"),
  bx(14, 62, 11, 14, 14, "blue"),
]);

/** 4 — Collecte et transfert des eaux usées : branchement et poste de relevage. */
const collecte = station("collecte", 83, -161, [
  pad(0, 0, 130, 108),
  bx(0, 0, 46, 38, 22, "shell"),
  roof(0, 0, 25, 18, 22),
  bx(38, -26, 24, 20, 14, "shell"),
  roof(38, -26, 13, 9, 14),
  bx(-46, 12, 18, 16, 10, "concrete"),
  cy(-46, 12, 5, 11, "steel"),
  cy(-24, 34, 6, 1.6, "steel"),
]);

/** 5 — Traitement des eaux usées : digesteurs, clarificateurs, rejet. */
const traitement = station("traitement", 358, -51, [
  pad(0, 4, 190, 165),
  cy(-44, -32, 18, 44, "shell"),
  cy(-44, -32, 18, 9, "deep", { rTop: 9, h: 44 }),
  cy(-44, 12, 18, 44, "shell"),
  cy(-44, 12, 18, 9, "deep", { rTop: 9, h: 44 }),
  cy(32, -26, 30, 5, "steel"),
  cy(32, -26, 27, 1.4, "water", { h: 5 }),
  cy(32, 38, 30, 5, "steel"),
  cy(32, 38, 27, 1.4, "water", { h: 5 }),
  bx(-8, 66, 40, 26, 14, "shell"),
  ...Array.from({ length: 4 }, (_, i) => bx(-23 + i * 10, 66, 6, 28, 2.2, "blue", 14)),
]);

/** 6 — Bureau d'études : la maîtrise d'œuvre, en retrait du flux. */
const bureau = station("bureau", -412, 168, [
  pad(0, 0, 104, 92),
  bx(0, 0, 42, 34, 18, "shell"),
  roof(0, 0, 23, 15, 18),
  bx(-32, 24, 20, 18, 12, "shell"),
  roof(-32, 24, 11, 7, 12),
]);

export const STATIONS: Station[] = [captage, production, distribution, collecte, traitement, bureau];

export const ORIGIN: Record<string, Vec2> = Object.fromEntries(
  STATIONS.map((s) => [s.id, s.origin]),
);

/* ------------------------------- Le paysage ------------------------------- */

const quadFrom = (corners: [number, number][], tone: Tone, h = 0): Solid => ({
  kind: "poly",
  points: corners.map(([x, y]) => at(x, y)),
  tone,
  h,
});

/** Ressource en eau brute au nord-ouest, milieu récepteur au sud-est. */
export const LANDSCAPE: Solid[] = [
  quadFrom([[-640, -300], [-300, -290], [-330, -200], [-640, -170]], "rawSoft", 0.2),
  quadFrom([[40, 300], [640, 70], [640, 160], [130, 320]], "waterSoft", 0.2),
];

/* -------------------------------- Le réseau -------------------------------- */

const wp = (s: string, du: number, dv: number, h = 3): Vec3 => ({
  u: ORIGIN[s].u + du,
  v: ORIGIN[s].v + dv,
  h,
});

/**
 * Le réseau est la colonne vertébrale narrative : il relie les stations dans
 * le sens de l'eau et porte l'animation d'écoulement.
 */
export const NETWORK: Solid[] = [
  // Ressource → captage
  pipe([wp("captage", -120, -70), wp("captage", -60, -70), wp("captage", -60, -30)]),
  // Captage → production
  pipe([wp("captage", 0, 62), wp("captage", 0, 120), wp("production", 0, -80), wp("production", 0, -56)]),
  // Production → château d'eau
  pipe([wp("production", 46, 40), wp("production", 120, 40), wp("distribution", -60, -60), wp("distribution", -14, -60), wp("distribution", -14, -36)]),
  // Château d'eau → réseau de distribution → abonné
  pipe([wp("distribution", 16, -8), wp("distribution", 130, -8), wp("collecte", -30, 70), wp("collecte", -30, 34)]),
  // Abonné → collecte des eaux usées
  pipe([wp("collecte", -24, 34), wp("collecte", -46, 34), wp("collecte", -46, 22)], 3.4, "deep"),
  // Collecte → transfert vers le traitement
  pipe([wp("collecte", 46, 12), wp("collecte", 130, 12), wp("traitement", -40, -120), wp("traitement", -44, -60)], 3.4, "deep"),
  // Traitement → rejet au milieu naturel
  pipe([wp("traitement", 62, 38), wp("traitement", 150, 38), wp("traitement", 150, 120)], 3.4, "cyan"),
];
