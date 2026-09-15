/**
 * Construit la carte d'écoulement qui pilote le front de remplissage.
 *
 * Deux informations sont calculées puis encodées dans une seule texture :
 *
 *   canal R — progression : distance géodésique depuis la prise d'eau, mesurée
 *             *le long du réseau* et non à vol d'oiseau. Le front suit donc le
 *             vrai parcours de l'eau, embranchements compris.
 *   canal G — intensité : de combien le pixel « devient bleu » entre les deux
 *             rendus. Isole les conduites et les bassins sans toucher aux plans
 *             d'eau, dont seule la texture de vagues diffère.
 *
 *   node scripts/build-flowmap.mjs --preview   images de contrôle
 *   node scripts/build-flowmap.mjs             produit public/scene/flow.png
 */

import sharp from "sharp";

const CROP_DRY = { left: 0, top: 0, width: 4095, height: 2364 };
const CROP_WET = { left: 4, top: 35, width: 4092, height: 2313 };
const W = 1236;
const H = Math.round((W / CROP_DRY.width) * CROP_DRY.height);

/** Prise d'eau en rivière, origine du parcours (fraction de l'image). */
const SEED = { x: 0.075, y: 0.247 };

const raw = async (src, crop) =>
  (await sharp(src).extract(crop).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer());

const [dry, wet] = await Promise.all([
  raw("public/visuel 3.png", CROP_DRY),
  raw("public/visuel 4.png", CROP_WET),
]);
console.log(`Espace de travail : ${W} × ${H}`);

// --- Intensité : gain de « bleu » entre les deux rendus ---------------------

const gain = new Float32Array(W * H);
const deep = new Float32Array(W * H);
let gMax = 0;
for (let p = 0, i = 0; p < W * H; p++, i += 3) {
  const d = (dry[i + 2] - dry[i]) / 255;
  const w = (wet[i + 2] - wet[i]) / 255;
  const g = Math.max(0, w - d);
  gain[p] = g;
  if (g > gMax) gMax = g;
  // Les conduites en eau sont bleu profond — composante bleue nettement
  // au-dessus du vert. Les plans d'eau, eux, sont cyan : bleu ≈ vert.
  deep[p] = (wet[i + 2] - wet[i + 1]) / 255;
}
console.log(`Gain de bleu maximal : ${gMax.toFixed(3)}`);

const THRESH = 0.14;
const DEEP_MIN = 0.1;
const mask = new Uint8Array(W * H);
for (let p = 0; p < W * H; p++) if (gain[p] > THRESH && deep[p] > DEEP_MIN) mask[p] = 1;

/** Étiquetage des composantes connexes, avec aire et boîte englobante. */
function components(src) {
  const label = new Int32Array(W * H).fill(-1);
  const list = [];
  const stack = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (!src[s] || label[s] >= 0) continue;
    const id = list.length;
    let top = 0;
    stack[top++] = s;
    label[s] = id;
    const box = { id, area: 0, x0: W, x1: 0, y0: H, y1: 0 };
    while (top > 0) {
      const p = stack[--top];
      const x = p % W;
      const y = (p / W) | 0;
      box.area++;
      if (x < box.x0) box.x0 = x;
      if (x > box.x1) box.x1 = x;
      if (y < box.y0) box.y0 = y;
      if (y > box.y1) box.y1 = y;
      const nb = [p - 1, p + 1, p - W, p + W];
      for (let k = 0; k < 4; k++) {
        const q = nb[k];
        if (q < 0 || q >= W * H || label[q] >= 0 || !src[q]) continue;
        if (k === 0 && x === 0) continue;
        if (k === 1 && x === W - 1) continue;
        label[q] = id;
        stack[top++] = q;
      }
    }
    list.push(box);
  }
  return { label, list };
}

// Les plans d'eau changent aussi de teinte entre les deux rendus, mais leur
// texture de vagues est re-générée : les mélanger ferait « sauter » l'image.
// On les écarte par leur aire, sans seuil de forme qui sacrifierait les bassins.
const AREA_MAX = 24000;
const first = components(mask);
const bulky = first.list.filter((c) => {
  const spanX = (c.x1 - c.x0) / W;
  const spanY = (c.y1 - c.y0) / H;
  const river =
    spanX > 0.35 && spanY > 0.25 && c.x1 > 0.75 * W && c.y1 > 0.75 * H;
  return c.area > AREA_MAX || river;
});
for (const c of bulky) {
  console.log(
    `Zone écartée (plan d'eau) : aire ${c.area}, x ${(c.x0 / W * 100).toFixed(0)}–${(c.x1 / W * 100).toFixed(0)} %, y ${(c.y0 / H * 100).toFixed(0)}–${(c.y1 / H * 100).toFixed(0)} %`,
  );
}
const drop = new Set(bulky.map((c) => c.id));
for (let p = 0; p < W * H; p++) if (drop.has(first.label[p])) mask[p] = 0;

const kept = mask.reduce((k, v) => k + v, 0);
console.log(`Pixels conduites retenus : ${kept} (${((kept / (W * H)) * 100).toFixed(2)} %)`);

// --- Dilatation : franchir les petits masquages ----------------------------

const dilate = (src, passes) => {
  const out = new Uint8Array(src);
  for (let pass = 0; pass < passes; pass++) {
    const next = new Uint8Array(out);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const p = y * W + x;
        if (out[p]) continue;
        if (out[p - 1] || out[p + 1] || out[p - W] || out[p + W]) next[p] = 1;
      }
    }
    out.set(next);
  }
  return out;
};

const wide = dilate(mask, 5);

{
  const { label, list } = components(wide);
  for (const c of list) {
    const spanX = (c.x1 - c.x0) / W;
    const spanY = (c.y1 - c.y0) / H;
    if (spanX > 0.35 && spanY > 0.25 && c.x1 > 0.75 * W && c.y1 > 0.75 * H) {
      console.log(
        `Zone écartée après dilatation (plan d'eau) : aire ${c.area}, x ${(c.x0 / W * 100).toFixed(0)}–${(c.x1 / W * 100).toFixed(0)} %, y ${(c.y0 / H * 100).toFixed(0)}–${(c.y1 / H * 100).toFixed(0)} %`,
      );
      for (let p = 0; p < W * H; p++) if (label[p] === c.id) wide[p] = 0;
    }
  }
}

/**
 * Raccordement automatique des tronçons.
 *
 * Le réseau apparaît en plusieurs morceaux : les conduites disparaissent
 * derrière les bâtiments, et la tranchée de distribution présente des tuyaux
 * encore vides. Plutôt que de saisir ces raccords à la main, on relie de proche
 * en proche chaque tronçon au groupe déjà connecté, en partant de la prise
 * d'eau. Les liaisons ne servent qu'au calcul du parcours, elles ne s'affichent
 * jamais.
 */
const MIN_AREA = 800;
const paint = (m, ax, ay, bx, by, r = 3) => {
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
  for (let i = 0; i <= steps; i++) {
    const cx = Math.round(ax + ((bx - ax) * i) / steps);
    const cy = Math.round(ay + ((by - ay) * i) / steps);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && y >= 0 && x < W && y < H) m[y * W + x] = 1;
      }
    }
  }
};

{
  const { label, list } = components(wide);
  const pts = list.map(() => []);
  for (let p = 0; p < W * H; p++) {
    const id = label[p];
    if (id >= 0 && p % 3 === 0) pts[id].push(p);
  }

  const live = list.filter((c) => c.area >= MIN_AREA).map((c) => c.id);
  const sx = Math.round(SEED.x * W);
  const sy = Math.round(SEED.y * H);
  let root = live[0];
  let bestRoot = Infinity;
  for (const id of live) {
    const c = list[id];
    const d = Math.hypot((c.x0 + c.x1) / 2 - sx, (c.y0 + c.y1) / 2 - sy);
    if (d < bestRoot) {
      bestRoot = d;
      root = id;
    }
  }

  const JOIN_MAX = 130 * 130;
  const joined = new Set([root]);
  const pending = new Set(live.filter((id) => id !== root));
  console.log(`\n${live.length} tronçons significatifs, raccordement depuis la prise d'eau :`);

  while (pending.size) {
    let pick = null;
    for (const id of pending) {
      for (const j of joined) {
        for (const p of pts[id]) {
          const px = p % W;
          const py = (p / W) | 0;
          for (const q of pts[j]) {
            const qx = q % W;
            const qy = (q / W) | 0;
            const d = (px - qx) ** 2 + (py - qy) ** 2;
            if (!pick || d < pick.d) pick = { d, id, px, py, qx, qy };
          }
        }
      }
    }
    if (!pick || pick.d > JOIN_MAX) {
      console.log(`  ${pending.size} tronçons laissés de côté (plus de 130 px)`);
      break;
    }
    paint(wide, pick.px, pick.py, pick.qx, pick.qy);
    joined.add(pick.id);
    pending.delete(pick.id);
    console.log(
      `  raccord de ${Math.sqrt(pick.d).toFixed(0)} px : ` +
        `(${((pick.qx / W) * 100).toFixed(1)}, ${((pick.qy / H) * 100).toFixed(1)}) → ` +
        `(${((pick.px / W) * 100).toFixed(1)}, ${((pick.py / H) * 100).toFixed(1)}) %`,
    );
  }

  // Les fragments trop petits (détails bleus du camion, fenêtres) resteraient
  // isolés et changeraient de teinte à un moment arbitraire : on les retire.
  const keep = new Set(live);
  for (let p = 0; p < W * H; p++) {
    if (label[p] >= 0 && !keep.has(label[p]) && mask[p]) mask[p] = 0;
  }
}

if (process.argv.includes("--components")) {
  const { list } = components(wide);
  console.log(`\n${list.length} composantes dans le réseau dilaté :`);
  for (const c of list.sort((a, b) => b.area - a.area).slice(0, 12)) {
    console.log(
      `  aire ${String(c.area).padStart(6)}  x ${(c.x0 / W * 100).toFixed(1)}–${(c.x1 / W * 100).toFixed(1)} %  ` +
        `y ${(c.y0 / H * 100).toFixed(1)}–${(c.y1 / H * 100).toFixed(1)} %`,
    );
  }
  process.exit(0);
}

// --- Progression : distance géodésique depuis la prise d'eau ---------------

const INF = 1e9;
const dist = new Float32Array(W * H).fill(INF);
const seed = Math.round(SEED.y * H) * W + Math.round(SEED.x * W);

/** Recherche du pixel de réseau le plus proche de la graine indiquée. */
let start = seed;
if (!wide[start]) {
  let best = INF;
  const sx = Math.round(SEED.x * W);
  const sy = Math.round(SEED.y * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!wide[y * W + x]) continue;
      const d = (x - sx) ** 2 + (y - sy) ** 2;
      if (d < best) {
        best = d;
        start = y * W + x;
      }
    }
  }
  console.log(`Graine recalée sur le réseau, à ${Math.sqrt(best).toFixed(0)} px`);
}

// Parcours en largeur sur le réseau dilaté : file simple, coût uniforme.
let queue = new Int32Array(W * H);
let head = 0;
let tail = 0;
dist[start] = 0;
queue[tail++] = start;

while (head < tail) {
  const p = queue[head++];
  const d = dist[p] + 1;
  const x = p % W;
  const neighbours = [p - 1, p + 1, p - W, p + W];
  for (let k = 0; k < 4; k++) {
    const q = neighbours[k];
    if (q < 0 || q >= W * H) continue;
    if (k === 0 && x === 0) continue;
    if (k === 1 && x === W - 1) continue;
    if (!wide[q] || dist[q] <= d) continue;
    dist[q] = d;
    queue[tail++] = q;
  }
}

let reach = 0;
let dMax = 0;
for (let p = 0; p < W * H; p++) {
  if (dist[p] < INF) {
    reach++;
    if (dist[p] > dMax) dMax = dist[p];
  }
}
console.log(`Réseau atteint : ${reach} pixels, longueur géodésique ${dMax.toFixed(0)}`);
const orphans = [...wide].filter(Boolean).length - reach;
console.log(`Pixels de réseau non reliés : ${orphans}`);

// --- Propagation à toute l'image : chaque pixel hérite du réseau le plus proche

const field = new Float32Array(dist);
queue = new Int32Array(W * H);
head = 0;
tail = 0;
const seen = new Uint8Array(W * H);
for (let p = 0; p < W * H; p++) {
  if (field[p] < INF) {
    seen[p] = 1;
    queue[tail++] = p;
  }
}
while (head < tail) {
  const p = queue[head++];
  const x = p % W;
  const neighbours = [p - 1, p + 1, p - W, p + W];
  for (let k = 0; k < 4; k++) {
    const q = neighbours[k];
    if (q < 0 || q >= W * H || seen[q]) continue;
    if (k === 0 && x === 0) continue;
    if (k === 1 && x === W - 1) continue;
    seen[q] = 1;
    field[q] = field[p];
    queue[tail++] = q;
  }
}

// --- Encodage ---------------------------------------------------------------

/**
 * Fenêtre de mélange : le masque retenu, élargi de quelques pixels puis adouci.
 * Hors de cette fenêtre l'image reste strictement celle du visuel « à vide »,
 * ce qui garantit qu'aucun plan d'eau ni aucun détail du décor ne change.
 */
const region = dilate(mask, 4);
const soft = new Float32Array(W * H);
const BLUR = 3;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let sum = 0;
    let n = 0;
    for (let dy = -BLUR; dy <= BLUR; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= H) continue;
      for (let dx = -BLUR; dx <= BLUR; dx++) {
        const xx = x + dx;
        if (xx < 0 || xx >= W) continue;
        sum += region[yy * W + xx];
        n++;
      }
    }
    soft[y * W + x] = sum / n;
  }
}

const out = Buffer.alloc(W * H * 3);
for (let p = 0, i = 0; p < W * H; p++, i += 3) {
  out[i] = Math.round(Math.min(1, field[p] / dMax) * 255);
  out[i + 1] = Math.round(soft[p] * 255);
  out[i + 2] = mask[p] ? 255 : 0;
}

if (process.argv.includes("--preview")) {
  await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .png()
    .toFile("/tmp/sogea-prev/flowmap.png");
  console.log("\nAperçu écrit dans /tmp/sogea-prev/flowmap.png");
  console.log("  rouge = progression le long du réseau, vert = intensité, bleu = masque");
} else {
  const info = await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .png({ compressionLevel: 9, palette: false })
    .toFile("public/scene/flow.png");
  console.log(`\npublic/scene/flow.png — ${info.width} × ${info.height}, ${(info.size / 1024).toFixed(0)} Ko`);
}
