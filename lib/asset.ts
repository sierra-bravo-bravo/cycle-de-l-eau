/** Préfixe les assets `public/` pour GitHub Pages (`/cycle-de-l-eau`). */
export function asset(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
