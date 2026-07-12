import tokensJson from './tokens.json';

/**
 * Design tokens MBOLO — source unique de vérité pour le web et le mobile.
 *
 * - Web : `apps/web/scripts/gen-tokens.mjs` génère les variables CSS
 *   (`--brand`, `--ink`, …) pour les thèmes clair et sombre à partir de ce JSON.
 * - Mobile : `apps/mobile/src/theme/colors.ts` mappe ces tokens sur ses clés
 *   historiques (`primary`, `textSecondary`, …).
 *
 * Modifier une couleur ici la propage partout ; ne jamais dupliquer un hex
 * dans les apps.
 */

export type ThemeTokens = Record<string, string>;

const { light, dark } = tokensJson as { light: ThemeTokens; dark: ThemeTokens };

export const lightTokens: ThemeTokens = light;
export const darkTokens: ThemeTokens = dark;

/** Palette catégorielle (5 services), ordre fixe — validée CVD. */
export const categorical = (t: ThemeTokens): string[] => [
  t['cat-1'], t['cat-2'], t['cat-3'], t['cat-4'], t['cat-5'],
];
