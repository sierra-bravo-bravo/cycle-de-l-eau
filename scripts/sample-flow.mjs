/**
 * Relève l'avancée du front à chaque étape du parcours.
 *
 * Les valeurs imprimées alimentent le champ `flow` de `content/chapters.ts` :
 * elles garantissent que l'eau atteint chaque ouvrage exactement au moment où
 * le chapitre correspondant prend la main.
 */

import sharp from "sharp";

const { data, info } = await sharp("public/scene/flow.png")
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

/** Points relevés sur le réseau, au plus près de chaque ouvrage. */
const POINTS = {
  "prise d'eau": [0.075, 0.247],
  captage: [0.305, 0.138],
  production: [0.185, 0.369],
  "chateau d'eau": [0.262, 0.604],
  tranchee: [0.439, 0.586],
  "maison / collecte": [0.572, 0.257],
  "transfert vers station": [0.679, 0.342],
  "clarificateurs": [0.789, 0.435],
  exutoire: [0.903, 0.595],
};

/** Valeur du canal de progression au pixel de réseau le plus proche. */
function sampleAlong(nx, ny) {
  const cx = Math.round(nx * W);
  const cy = Math.round(ny * H);
  for (let r = 0; r < 90; r++) {
    let best = null;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = (y * W + x) * 3;
        if (data[i + 2] < 128) continue; // hors réseau
        const d = dx * dx + dy * dy;
        if (!best || d < best.d) best = { d, v: data[i] / 255, r };
      }
    }
    if (best) return best;
  }
  return null;
}

console.log(`Carte ${W} × ${H}\n`);
console.log("étape                      avancée   distance au réseau");
for (const [name, [nx, ny]] of Object.entries(POINTS)) {
  const s = sampleAlong(nx, ny);
  console.log(
    s
      ? `${name.padEnd(26)} ${s.v.toFixed(3)}     ${Math.sqrt(s.d).toFixed(0)} px`
      : `${name.padEnd(26)} hors réseau`,
  );
}
