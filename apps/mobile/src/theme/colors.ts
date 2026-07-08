export const colors = {
  primary:        '#0E9384', // teal MBOLO 2.0 (vif)
  primaryLight:   '#5FD3C4',
  primarySurface: '#E7F4F2',
  primaryDeep:    '#0B6B60',

  accent:         '#EF8A5E', // terracotta chaleureuse
  accentLight:    '#FFE2D6',

  background:     '#F4F9F8', // teinté teal (choisi, pas hérité)
  surface:        '#FFFFFF',
  border:         '#E3EDEB',
  borderFocus:    '#0E9384',

  text:           '#0F2C29', // ink teal
  textSecondary:  '#5B7A76',
  textDisabled:   '#9DB5B1',
  textOnDark:     '#FFFFFF',

  success:        '#12A150',
  successSurface: '#DBF6E5',
  warning:        '#C77A0A',
  warningSurface: '#FBEFD3',
  error:          '#DC2626',
  errorSurface:   '#FCE4E4',
  info:           '#0E82C7',
  infoSurface:    '#DDEEFB',

  overlay:        'rgba(6, 32, 31, 0.55)',
} as const;

export type ColorKey = keyof typeof colors;
