/**
 * Mesure la transformation qui superpose visuel 2 sur visuel 1.
 *
 * Le champ de déplacement mesuré est affine à axes séparés — échelle
 * horizontale et verticale distinctes, sans rotation ni cisaillement :
 *
 *     x₂ = sx · x₁ + tx        y₂ = sy · y₁ + ty
 *
 * La trame de points du fond produit de nombreux faux appariements (un motif
 * répétitif s'accorde parfaitement à n'importe quel multiple de son pas), d'où
 * un ajustement robuste par RANSAC plutôt qu'un moindre carré global.
 */

import sharp from "sharp";

const load = async (p) => {
  const { data, info } = await sharp(p).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};

const [a, b] = await Promise.all([load("public/visuel 3.png"), load("public/visuel 4.png")]);
const R = 64;

function sad(cx, cy, qx, qy, step) {
  let sum = 0;
  let n = 0;
  for (let dy = -R; dy <= R; dy += step) {
    for (let dx = -R; dx <= R; dx += step) {
      const ax = cx + dx;
      const ay = cy + dy;
      const bx = qx + dx;
      const by = qy + dy;
      if (ax < 0 || ay < 0 || ax >= a.w || ay >= a.h) continue;
      if (bx < 0 || by < 0 || bx >= b.w || by >= b.h) continue;
      sum += Math.abs(a.data[ay * a.w + ax] - b.data[by * b.w + bx]);
      n++;
    }
  }
  return n ? sum / n : Infinity;
}

function contrast(cx, cy) {
  let min = 255;
  let max = 0;
  for (let dy = -R; dy <= R; dy += 3) {
    for (let dx = -R; dx <= R; dx += 3) {
      const v = a.data[(cy + dy) * a.w + (cx + dx)];
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return max - min;
}

function match(cx, cy) {
  let best = { err: Infinity, x: cx, y: cy };
  for (let qy = cy - 230; qy <= cy + 230; qy += 3) {
    for (let qx = cx - 120; qx <= cx + 120; qx += 3) {
      const err = sad(cx, cy, qx, qy, 4);
      if (err < best.err) best = { err, x: qx, y: qy };
    }
  }
  const c = { ...best };
  for (let qy = c.y - 4; qy <= c.y + 4; qy++) {
    for (let qx = c.x - 4; qx <= c.x + 4; qx++) {
      const err = sad(cx, cy, qx, qy, 1);
      if (err < best.err) best = { err, x: qx, y: qy };
    }
  }
  const e0 = sad(cx, cy, best.x, best.y, 1);
  const sub = (m, p) => {
    const den = m - 2 * e0 + p;
    return Math.abs(den) < 1e-6 ? 0 : (0.5 * (m - p)) / den;
  };
  return {
    err: best.err,
    x: best.x + sub(sad(cx, cy, best.x - 1, best.y, 1), sad(cx, cy, best.x + 1, best.y, 1)),
    y: best.y + sub(sad(cx, cy, best.x, best.y - 1, 1), sad(cx, cy, best.x, best.y + 1, 1)),
  };
}

const samples = [];
for (let ny = 0.12; ny <= 0.88; ny += 0.055) {
  for (let nx = 0.08; nx <= 0.94; nx += 0.045) {
    const cx = Math.round(nx * a.w);
    const cy = Math.round(ny * a.h);
    if (cx < R + 130 || cy < R + 240 || cx > a.w - R - 130 || cy > a.h - R - 240) continue;
    if (contrast(cx, cy) < 70) continue;
    const m = match(cx, cy);
    if (m.err > 22) continue;
    samples.push({ ax: cx, ay: cy, bx: m.x, by: m.y, err: m.err });
  }
}
console.log(`${samples.length} motifs contrastés appariés`);

/** RANSAC 1D : ajuste v₂ = s·v₁ + t en rejetant les appariements aberrants. */
function ransac(pairs, tol) {
  let best = { inliers: [], s: 1, t: 0 };
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const [p, q] = [pairs[i], pairs[j]];
      if (Math.abs(q[0] - p[0]) < 600) continue;
      const s = (q[1] - p[1]) / (q[0] - p[0]);
      const t = p[1] - s * p[0];
      const inliers = pairs.filter(([u, v]) => Math.abs(s * u + t - v) < tol);
      if (inliers.length > best.inliers.length) best = { inliers, s, t };
    }
  }
  // Moindres carrés sur les seuls inliers, pour la précision finale.
  const n = best.inliers.length;
  const su = best.inliers.reduce((k, [u]) => k + u, 0);
  const sv = best.inliers.reduce((k, [, v]) => k + v, 0);
  const suu = best.inliers.reduce((k, [u]) => k + u * u, 0);
  const suv = best.inliers.reduce((k, [u, v]) => k + u * v, 0);
  const s = (n * suv - su * sv) / (n * suu - su * su);
  const t = (sv - s * su) / n;
  const resid = best.inliers.map(([u, v]) => Math.abs(s * u + t - v));
  return { s, t, n, max: Math.max(...resid), rms: Math.hypot(...resid) / Math.sqrt(n) };
}

const fx = ransac(samples.map((s) => [s.ax, s.bx]), 3);
const fy = ransac(samples.map((s) => [s.ay, s.by]), 3);

console.log(`\nHorizontal : x₂ = ${fx.s.toFixed(5)}·x₁ + ${fx.t.toFixed(2)}`);
console.log(`             ${fx.n} inliers, résidu RMS ${fx.rms.toFixed(2)} px, max ${fx.max.toFixed(2)} px`);
console.log(`Vertical   : y₂ = ${fy.s.toFixed(5)}·y₁ + ${fy.t.toFixed(2)}`);
console.log(`             ${fy.n} inliers, résidu RMS ${fy.rms.toFixed(2)} px, max ${fy.max.toFixed(2)} px`);

const ok = fx.max < 3 && fy.max < 3;
console.log(`\n→ ${ok ? "Recalage 2D exact." : "Résidu trop élevé, superposition imparfaite."}`);
console.log(
  `\nconst FIT = { sx: ${fx.s.toFixed(6)}, tx: ${fx.t.toFixed(2)}, sy: ${fy.s.toFixed(6)}, ty: ${fy.t.toFixed(2)} };`,
);
