/**
 * Where a popup may appear.
 *
 * The single list both the schema enum and the admin dropdown are built from,
 * so an editor cannot be offered a page that the column refuses, or vice
 * versa. The rendering pass (phase 2) reads this column to decide whether a
 * popup belongs on the page being served.
 */
export const POPUP_PLACEMENT_VALUES = [
  'everywhere',
  'home',
  'services',
  'pricing',
  'blog',
  'faq',
  'reviews',
] as const;

export type PopupPlacement = (typeof POPUP_PLACEMENT_VALUES)[number];

/** How each placement reads to an editor. */
export const POPUP_PLACEMENT_LABEL: Record<PopupPlacement, string> = {
  everywhere: 'Every page',
  home: 'Home',
  services: 'Services',
  pricing: 'Pricing',
  blog: 'Blog',
  faq: 'FAQ',
  reviews: 'Reviews',
};

export function isPopupPlacement(value: string): value is PopupPlacement {
  return (POPUP_PLACEMENT_VALUES as readonly string[]).includes(value);
}

/**
 * Which placement a public path is on.
 *
 * The renderer (components/popups) calls this on every navigation so a popup
 * placed on "Blog" only appears on /blog and its articles, and a popup placed
 * on a page that is not in the map at all never appears there. 'everywhere'
 * still applies on every path — the caller ORs that in.
 *
 * Paths are matched by directory, so /services/<slug> is 'services', and the
 * home page is exact — a placement of "Home" must not leak onto /qualify.
 */
export function placementForPathname(pathname: string): PopupPlacement | null {
  if (pathname === '/') return 'home';
  const byPrefix: Array<[string, Exclude<PopupPlacement, 'everywhere' | 'home'>]> = [
    ['/services', 'services'],
    ['/pricing', 'pricing'],
    ['/blog', 'blog'],
    ['/faq', 'faq'],
    ['/reviews', 'reviews'],
  ];
  for (const [prefix, placement] of byPrefix) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return placement;
  }
  return null;
}

/** True when a popup placed at `placement` belongs on `pathname`. */
export function popupAppliesTo(placement: string, pathname: string): boolean {
  if (placement === 'everywhere') return true;
  return placement === placementForPathname(pathname);
}