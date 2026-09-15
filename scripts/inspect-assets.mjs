/**
 * Contrôle d'alignement des visuels sources.
 *
 * Le mélange en shader suppose que les deux rendus sont superposables au pixel
 * près. Ce script mesure l'écart entre eux et localise la zone où ils diffèrent,
 * c'est-à-dire le tracé des canalisations.
 */

import sharp from "sharp";

const A = "public/visuel 3.png";
const B = "public/visuel 4.png";
const GRID = 64;

const load = async (p) => {
  const img = sharp(p);
  const meta = await img.metadata();
  const data = await img.ensureAlpha().raw().toBuffer();
  return { meta, data };
};

const [a, b] = await Promise.all([load(A), load(B)]);
console.log(`visuel 3 : ${a.meta.width} × ${a.meta.height}`);
console.log(`visuel 4 : ${b.meta.width} × ${b.meta.height}`);

if (a.meta.width !== b.meta.width || a.meta.height !== b.meta.height) {
  console.error("Dimensions différentes — recalage nécessaire.");
  process.exit(1);
}

const { width: W, height: H } = a.meta;
let diffPixels = 0;
let maxDelta = 0;
let sumDelta = 0;
let minX = W;
let maxX = 0;
let minY = H;
let maxY = 0;
const heat = Array.from({ length: GRID }, () => new Array(GRID).fill(0));

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const d =
      Math.abs(a.data[i] - b.data[i]) +
      Math.abs(a.data[i + 1] - b.data[i + 1]) +
      Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (d > 18) {
      diffPixels++;
      sumDelta += d;
      if (d > maxDelta) maxDelta = d;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      heat[Math.floor((y / H) * GRID)][Math.floor((x / W) * GRID)]++;
    }
  }
}

const total = W * H;
console.log(`\nPixels différents : ${diffPixels} (${((diffPixels / total) * 100).toFixed(2)} %)`);
console.log(`Écart moyen sur ces pixels : ${(sumDelta / diffPixels).toFixed(1)} / 765, max ${maxDelta}`);
console.log(`Zone de différence : x ${minX}–${maxX}, y ${minY}–${maxY}`);
console.log(
  `Normalisée : x ${(minX / W).toFixed(3)}–${(maxX / W).toFixed(3)}, y ${(minY / H).toFixed(3)}–${(maxY / H).toFixed(3)}`,
);

const peak = Math.max(...heat.flat());
const ramp = " .:-=+*#%@";
console.log("\nCarte des différences (le tracé des canalisations) :");
for (const row of heat) {
  console.log(row.map((c) => ramp[Math.min(9, Math.round((c / peak) * 9))]).join(""));
}
