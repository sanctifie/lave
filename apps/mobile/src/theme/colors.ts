import { lightTokens, darkTokens, ThemeTokens } from '@mbolo/shared';

/**
 * Couleurs du mobile — dérivées des design tokens partagés (@mbolo/shared),
 * source unique de vérité commune avec le dashboard web. Ne jamais écrire un
 * hex ici : modifier packages/shared/src/tokens/tokens.json.
 *
 * Les clés historiques (primary, textSecondary, …) sont conservées pour ne pas
 * toucher aux 40+ écrans qui les consomment.
 */
function palette(t: ThemeTokens) {
  return {
    primary:        t['brand'],
    primaryLight:   t['brand-tint'],
    primarySurface: t['brand-surface'],
    primaryDeep:    t['brand-deep'],

    accent:         t['accent'],
    accentLight:    t['accent-light'],

    background:     t['canvas'],
    surface:        t['surface'],
    border:         t['border'],
    borderFocus:    t['border-focus'],

    text:           t['ink'],
    textSecondary:  t['text-secondary'],
    textDisabled:   t['text-disabled'],
    textOnDark:     t['text-on-dark'],

    success:        t['success'],
    successSurface: t['success-surface'],
    warning:        t['warning'],
    warningSurface: t['warning-surface'],
    error:          t['error'],
    errorSurface:   t['error-surface'],
    info:           t['info'],
    infoSurface:    t['info-surface'],

    overlay:        t['overlay'],
  } as const;
}

/** Palette claire — thème par défaut de l'app. */
export const colors = palette(lightTokens);

/**
 * Palette sombre — prête pour le passage au mode sombre : brancher un
 * ThemeProvider sur `useColorScheme()` et servir cette palette. Les écrans
 * devront alors consommer les couleurs via le provider plutôt que par import
 * statique (migration progressive, à valider visuellement sur device).
 */
export const darkColors = palette(darkTokens);

export type ColorKey = keyof typeof colors;
