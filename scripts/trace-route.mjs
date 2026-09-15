/**
 * Extrait le tracé du réseau depuis le visuel « rempli ».
 *
 * Les canalisations en eau sont le seul élément fortement bleu saturé de
 * l'image. On en tire une carte que l'on relève pour écrire la polyligne du
 * parcours, qui pilotera le front de remplissage dans le shader.
 */

import sharp from "sharp";

const COLS = 108;
const ROWS = 54;

const cropWet = { left: 0, top: 1, width: 4952, height: 2761 };
const { data, info } = await sharp("public/visuel 2.png")
  .extract(cropWet)
  .resize(COLS * 4, ROWS * 4, { fit: "fill" })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width: W, height: H } = info;
const cell = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Bleu franc des conduites : composante bleue nettement dominante.
    if (b > 110 && b - r > 60 && b - g > 35) {
      cell[Math.floor((y / H) * ROWS)][Math.floor((x / W) * COLS)]++;
    }
  }
}

const peak = Math.max(...cell.flat());
const ramp = " .:-=+*#%@";
const header = Array.from({ length: COLS }, (_, i) => (i % 10 === 0 ? String((i / 10) % 10) : " ")).join("");

console.log(`Masque des conduites en eau — grille ${COLS} × ${ROWS}`);
console.log(`Chaque colonne vaut ${(100 / COLS).toFixed(2)} % de largeur, chaque ligne ${(100 / ROWS).toFixed(2)} % de hauteur\n`);
console.log(`     ${header}`);
cell.forEach((row, y) => {
  const line = row.map((c) => ramp[Math.min(9, Math.round((c / peak) * 9))]).join("");
  console.log(`${String(y).padStart(3)}  ${line}`);
});
