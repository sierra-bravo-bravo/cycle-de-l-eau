/**
 * Recalage et optimisation des visuels 3 (vide) et 4 (rempli).
 *
 * Les deux rendus ont la même taille (4096×2364) mais visuel 4 n'est pas une
 * simple translation : il est légèrement plus compact en hauteur. Le mélange
 * en shader exige une superposition exacte, d'où une affinité à axes séparés
 *
 *     x₄ = sx · x₃ + tx        y₄ = sy · y₃ + ty
 *
 * puis un recadrage sur la zone commune et l'export WebP.
 *
 *   node scripts/prepare-assets.mjs --check   contrôle la superposition
 *   node scripts/prepare-assets.mjs           produit les exports
 */

import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SRC_DRY = "public/visuel 3.png";
const SRC_WET = "public/visuel 4.png";
const OUT = "public/scene";
const WIDTHS = [4200, 2800, 1800];

/** visuel 4 = visuel 3 mis à l'échelle puis translaté. */
const FIT = { sx: 0.999296, tx: 3.51, sy: 0.978611, ty: 34.82 };
const SRC = { w: 4096, h: 2364 };

const cropDry = {
  left: Math.max(0, Math.ceil((0 - FIT.tx) / FIT.sx)),
  top: Math.max(0, Math.ceil((0 - FIT.ty) / FIT.sy)),
  width: 0,
  height: 0,
};
cropDry.width =
  Math.min(SRC.w, Math.floor((SRC.w - FIT.tx) / FIT.sx)) - cropDry.left;
cropDry.height =
  Math.min(SRC.h, Math.floor((SRC.h - FIT.ty) / FIT.sy)) - cropDry.top;

const cropWet = {
  left: Math.round(FIT.sx * cropDry.left + FIT.tx),
  top: Math.round(FIT.sy * cropDry.top + FIT.ty),
  width: Math.round(FIT.sx * cropDry.width),
  height: Math.round(FIT.sy * cropDry.height),
};

const at = (width) => {
  const height = Math.round((width / cropDry.width) * cropDry.height);
  return {
    height,
    dry: () => sharp(SRC_DRY).extract(cropDry).resize(width, height, { fit: "fill" }),
    wet: () => sharp(SRC_WET).extract(cropWet).resize(width, height, { fit: "fill" }),
  };
};

console.log(
  `Cadre commun : ${cropDry.width} × ${cropDry.height} (rapport ${(cropDry.width / cropDry.height).toFixed(4)})`,
);
console.log(
  `  visuel 3 : extraction ${cropDry.width}×${cropDry.height} à (${cropDry.left}, ${cropDry.top})`,
);
console.log(
  `  visuel 4 : extraction ${cropWet.width}×${cropWet.height} à (${cropWet.left}, ${cropWet.top})`,
);

if (process.argv.includes("--check")) {
  const GRID = 56;
  const probe = at(720);
  const [ra, rb] = await Promise.all([
    probe.dry().ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    probe.wet().ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const { width: W, height: H } = ra.info;
  const heat = Array.from({ length: GRID }, () => new Array(GRID).fill(0));
  let diff = 0;
  let sum = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const d =
        Math.abs(ra.data[i] - rb.data[i]) +
        Math.abs(ra.data[i + 1] - rb.data[i + 1]) +
        Math.abs(ra.data[i + 2] - rb.data[i + 2]);
      sum += d;
      if (d > 45) {
        diff++;
        heat[Math.floor((y / H) * GRID)][Math.floor((x / W) * GRID)]++;
      }
    }
  }

  console.log(`\nÉcart moyen global : ${(sum / (W * H)).toFixed(2)} / 765`);
  console.log(`Pixels nettement différents : ${((diff / (W * H)) * 100).toFixed(2)} %`);
  const peak = Math.max(...heat.flat());
  const ramp = " .:-=+*#%@";
  console.log("\nCarte des différences après recalage (doit dessiner le réseau) :");
  for (const row of heat) {
    console.log(row.map((c) => ramp[Math.min(9, Math.round((c / peak) * 9))]).join(""));
  }
  process.exit(0);
}

await mkdir(OUT, { recursive: true });
const manifest = { aspect: cropDry.width / cropDry.height, widths: [] };

for (const width of WIDTHS) {
  const variants = at(width);
  for (const name of ["dry", "wet"]) {
    const info = await variants[name]()
      .webp({ quality: 84, effort: 6 })
      .toFile(`${OUT}/${name}-${width}.webp`);
    console.log(
      `${OUT}/${name}-${width}.webp — ${info.width} × ${info.height}, ${(info.size / 1024).toFixed(0)} Ko`,
    );
  }
  manifest.widths.push(width);
}

await writeFile(`${OUT}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\nRapport d'aspect : ${manifest.aspect.toFixed(4)}`);
