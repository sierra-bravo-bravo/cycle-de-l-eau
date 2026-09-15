/**
 * État de la vue, muté à 60 fps hors du cycle de rendu React.
 *
 * Le repère est celui de l'image : `x` et `y` sont des fractions de la largeur
 * et de la hauteur du visuel (origine en haut à gauche), `zoom` vaut 1 quand
 * la largeur entière tient dans la fenêtre. `flow` est l'avancée du front
 * d'eau le long du réseau, dans l'échelle de la carte d'écoulement.
 */

export type View = { x: number; y: number; zoom: number; flow: number };

export const view: View = { x: 0.5, y: 0.5, zoom: 1, flow: 0 };

/** Rapport largeur / hauteur du cadre commun aux deux visuels. */
export const IMAGE_ASPECT = 4095 / 2364;

export const viewport = { w: 1440, h: 900 };

export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/**
 * Zoom qui fait tenir le visuel entier dans la fenêtre (letterbox blanc
 * accepté). `view.zoom` est un multiplicateur de ce cadrage : 1 = tout le
 * cycle visible, 0.75 = un cran plus large, 2 = deux fois plus près.
 */
export function containZoom(): number {
  const canvasAspect = viewport.w / Math.max(1, viewport.h);
  return Math.min(1, IMAGE_ASPECT / canvasAspect);
}

export function effectiveZoom(): number {
  return containZoom() * Math.max(0.5, view.zoom);
}

/** Demi-étendue visible, en fractions d'image. */
export function halfSpan(): { x: number; y: number } {
  const z = effectiveZoom();
  const canvasAspect = viewport.w / Math.max(1, viewport.h);
  return { x: 0.5 / z, y: (0.5 * IMAGE_ASPECT) / (canvasAspect * z) };
}

/** Centre de vue borné pour que le cadrage reste à l'intérieur du visuel. */
export function clampedCenter(): { x: number; y: number } {
  const h = halfSpan();
  const fit = (c: number, half: number) =>
    half >= 0.5 ? 0.5 : Math.min(1 - half, Math.max(half, c));
  return { x: fit(view.x, h.x), y: fit(view.y, h.y) };
}

/** Position image (fractions) → pixels écran, au cadrage courant. */
export function toScreen(x: number, y: number): { x: number; y: number } {
  const c = clampedCenter();
  const h = halfSpan();
  return {
    x: ((x - c.x) / (2 * h.x) + 0.5) * viewport.w,
    y: ((y - c.y) / (2 * h.y) + 0.5) * viewport.h,
  };
}
