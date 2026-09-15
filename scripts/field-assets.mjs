/**
 * Cartographie le champ de déplacement entre visuel 1 et visuel 2.
 *
 * Si les deux rendus ne diffèrent que par un cadrage (zoom + recadrage 2D), le
 * déplacement varie linéairement avec la position. S'il varie autrement, la
 * caméra 3D a bougé et aucune transformation 2D ne pourra les superposer.
 */

import sharp from "sharp";

const load = async (p) => {
  const { data, info } = await sharp(p).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};

const [a, b] = await Promise.all([load("public/visuel 1.png"), load("public/visuel 2.png")]);
const R = 60;

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

/** Contraste local : un motif plat ne peut pas être apparié de façon fiable. */
function contrast(cx, cy) {
  let min = 255;
  let max = 0;
  for (let dy = -R; dy <= R; dy += 4) {
    for (let dx = -R; dx <= R; dx += 4) {
      const v = a.data[(cy + dy) * a.w + (cx + dx)];
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return max - min;
}

function match(cx, cy) {
  let best = { err: Infinity, x: cx, y: cy };
  for (let qy = cy - 240; qy <= cy + 240; qy += 4) {
    for (let qx = cx - 240; qx <= cx + 240; qx += 4) {
      const err = sad(cx, cy, qx, qy, 4);
      if (err < best.err) best = { err, x: qx, y: qy };
    }
  }
  const c = { ...best };
  for (let qy = c.y - 5; qy <= c.y + 5; qy++) {
    for (let qx = c.x - 5; qx <= c.x + 5; qx++) {
      const err = sad(cx, cy, qx, qy, 1);
      if (err < best.err) best = { err, x: qx, y: qy };
    }
  }
  return best;
}

console.log("Déplacements mesurés sur une grille (motifs contrastés uniquement)\n");
console.log("    position source        déplacement      contraste  résidu");

const samples = [];
for (const ny of [0.2, 0.35, 0.5, 0.65, 0.8]) {
  for (const nx of [0.15, 0.3, 0.45, 0.6, 0.75, 0.9]) {
    const cx = Math.round(nx * a.w);
    const cy = Math.round(ny * a.h);
    if (cx < R + 250 || cy < R + 250 || cx > a.w - R - 250 || cy > a.h - R - 250) continue;
    const ct = contrast(cx, cy);
    if (ct < 40) continue;
    const m = match(cx, cy);
    const dx = m.x - cx;
    const dy = m.y - cy;
    samples.push({ cx, cy, dx, dy, err: m.err, ct });
    console.log(
      `  (${String(cx).padStart(4)}, ${String(cy).padStart(4)})   ` +
        `(${String(dx).padStart(5)}, ${String(dy).padStart(5)})   ` +
        `${String(ct).padStart(6)}   ${m.err.toFixed(1).padStart(6)}`,
    );
  }
}

// Ajustement affine par moindres carrés sur les appariements fiables.
const good = samples.filter((s) => s.err < 12);
console.log(`\n${good.length} appariements fiables sur ${samples.length}`);

if (good.length >= 3) {
  const solve = (key) => {
    let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, n = 0;
    let bx = 0, by = 0, b1 = 0;
    for (const s of good) {
      const t = s[key];
      sxx += s.cx * s.cx; sxy += s.cx * s.cy; syy += s.cy * s.cy;
      sx += s.cx; sy += s.cy; n++;
      bx += s.cx * t; by += s.cy * t; b1 += t;
    }
    const M = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]];
    const V = [bx, by, b1];
    for (let i = 0; i < 3; i++) {
      let p = i;
      for (let r = i + 1; r < 3; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
      [M[i], M[p]] = [M[p], M[i]];
      [V[i], V[p]] = [V[p], V[i]];
      for (let r = 0; r < 3; r++) {
        if (r === i) continue;
        const f = M[r][i] / M[i][i];
        for (let c = i; c < 3; c++) M[r][c] -= f * M[i][c];
        V[r] -= f * V[i];
      }
    }
    return [V[0] / M[0][0], V[1] / M[1][1], V[2] / M[2][2]];
  };

  const [axx, axy, ax0] = solve("dx");
  const [ayx, ayy, ay0] = solve("dy");
  console.log(`\nModèle affine du déplacement :`);
  console.log(`  dx = ${axx.toFixed(5)}·x + ${axy.toFixed(5)}·y + ${ax0.toFixed(1)}`);
  console.log(`  dy = ${ayx.toFixed(5)}·x + ${ayy.toFixed(5)}·y + ${ay0.toFixed(1)}`);

  let worst = 0;
  let rms = 0;
  for (const s of good) {
    const ex = axx * s.cx + axy * s.cy + ax0 - s.dx;
    const ey = ayx * s.cx + ayy * s.cy + ay0 - s.dy;
    const e = Math.hypot(ex, ey);
    rms += e * e;
    if (e > worst) worst = e;
  }
  console.log(
    `  Résidu du modèle : RMS ${Math.sqrt(rms / good.length).toFixed(2)} px, max ${worst.toFixed(2)} px`,
  );
  console.log(
    `\n  → ${worst < 3 ? "Recalage 2D exact possible." : "Le déplacement n'est pas affine : les caméras 3D diffèrent."}`,
  );
}
