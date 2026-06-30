/**
 * Tokens de design du dashboard web — alignés sur la charte du mobile
 * (apps/mobile/src/theme). Source unique pour la couleur de marque afin d'éviter
 * les valeurs hexadécimales dispersées dans les composants.
 */
export const theme = {
  brand:        '#006D77', // teal MBOLO (= colors.primary mobile)
  brandLight:   '#83C5BE',
  brandSurface: '#EDF6F9',

  // Neutres
  ink:          '#1E293B', // titres / texte fort
  body:         '#334155',
  muted:        '#64748B',
  faint:        '#94A3B8',
  border:       '#E2E8F0',
  surface:      '#FFFFFF',
  canvas:       '#F8FAFC',

  // Sémantique
  success:        '#16A34A',
  successSurface: '#DCFCE7',
  warning:        '#D97706',
  warningSurface: '#FEF3C7',
  error:          '#DC2626',
  errorSurface:   '#FEE2E2',
  info:           '#2563EB',
  infoSurface:    '#DBEAFE',
} as const;
