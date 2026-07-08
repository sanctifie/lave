/**
 * Tokens de design du dashboard web — « MBOLO 2.0 », alignés sur la charte
 * premium du mobile. Source unique pour la couleur de marque afin d'éviter
 * les valeurs hexadécimales dispersées dans les composants.
 */
export const theme = {
  brand:        '#0E9384', // teal MBOLO (accent vif)
  brandDeep:    '#0B6B60',
  brandDark:    '#08312E', // fonds sombres (sidebar)
  brandLight:   '#5FD3C4',
  brandSurface: '#E7F4F2',
  gold:         '#F6A417',

  // Dégradés signature
  gradBrand:    'linear-gradient(145deg, #12B3A2, #0B6B60)',
  gradSidebar:  'linear-gradient(180deg, #0A3B37 0%, #072220 100%)',
  gradHero:     'linear-gradient(135deg, #0E9384 0%, #0B6B60 55%, #0A4F49 100%)',

  // Neutres (légère teinte teal — choisis, pas hérités)
  ink:          '#0F2C29', // titres / texte fort
  body:         '#33514D',
  muted:        '#6B8B87',
  faint:        '#9DB5B1',
  border:       '#E3EDEB',
  surface:      '#FFFFFF',
  canvas:       '#F4F9F8',

  // Élévation
  radius:       16,
  radiusLg:     20,
  shadowSm:     '0 1px 2px rgba(8,49,46,.06), 0 1px 3px rgba(8,49,46,.05)',
  shadow:       '0 4px 14px -4px rgba(8,49,46,.12), 0 2px 6px -2px rgba(8,49,46,.08)',
  shadowLg:     '0 18px 40px -16px rgba(8,49,46,.26)',

  // Sémantique
  success:        '#12A150',
  successSurface: '#DBF6E5',
  warning:        '#C77A0A',
  warningSurface: '#FBEFD3',
  error:          '#DC2626',
  errorSurface:   '#FCE4E4',
  info:           '#2563EB',
  infoSurface:    '#DDE9FE',
} as const;
