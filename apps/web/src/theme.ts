/**
 * Tokens de design du dashboard web — « MBOLO 2.0 », alignés sur la charte
 * premium du mobile.
 *
 * Les couleurs pointent vers des variables CSS (définies dans index.css) afin de
 * supporter le mode clair ET le mode sombre sans réécrire les composants : un
 * style inline `color: theme.ink` produit `color: var(--ink)`, résolu
 * dynamiquement selon le thème actif (`data-theme` sur <html>).
 *
 * Les tokens non colorés (rayons) restent des valeurs brutes.
 */
export const theme = {
  brand:        'var(--brand)',
  brandDeep:    'var(--brand-deep)',
  brandDark:    'var(--brand-dark)',
  brandLight:   'var(--brand-light)',
  brandSurface: 'var(--brand-surface)',
  gold:         'var(--gold)',

  // Dégradés signature
  gradBrand:    'linear-gradient(145deg, #12B3A2, #0B6B60)',
  gradSidebar:  'var(--grad-sidebar)',
  gradHero:     'linear-gradient(135deg, #0E9384 0%, #0B6B60 55%, #0A4F49 100%)',

  // Neutres (teinte teal — sémantiques, adaptés par thème)
  ink:          'var(--ink)',    // titres / texte fort
  body:         'var(--body)',
  muted:        'var(--muted)',
  faint:        'var(--faint)',
  border:       'var(--border)',
  surface:      'var(--surface)',
  canvas:       'var(--canvas)',

  // Élévation
  radius:       16,
  radiusLg:     20,
  shadowSm:     'var(--shadow-sm)',
  shadow:       'var(--shadow)',
  shadowLg:     'var(--shadow-lg)',

  // Sémantique (valeurs pilotées par les variables CSS — cf. index.css, dark mode).
  // Le succès est un vert « herbe » franc, volontairement éloigné du teal de marque
  // pour que « validé » ne se confonde jamais avec un accent.
  success:        'var(--success)',
  successSurface: 'var(--success-surface)',
  warning:        'var(--warning)',
  warningSurface: 'var(--warning-surface)',
  error:          'var(--error)',
  errorSurface:   'var(--error-surface)',
  info:           'var(--info)',
  infoSurface:    'var(--info-surface)',
} as const;
