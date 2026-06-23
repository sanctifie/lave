export const colors = {
  primary:        '#006D77',
  primaryLight:   '#83C5BE',
  primarySurface: '#EDF6F9',

  accent:         '#E29578',
  accentLight:    '#FFDDD2',

  background:     '#F4F7F8',
  surface:        '#FFFFFF',
  border:         '#E2E8F0',
  borderFocus:    '#006D77',

  text:           '#1A1A2E',
  textSecondary:  '#64748B',
  textDisabled:   '#94A3B8',
  textOnDark:     '#FFFFFF',

  success:        '#059669',
  successSurface: '#D1FAE5',
  warning:        '#D97706',
  warningSurface: '#FEF3C7',
  error:          '#DC2626',
  errorSurface:   '#FEE2E2',
  info:           '#0284C7',
  infoSurface:    '#E0F2FE',

  overlay:        'rgba(26, 26, 46, 0.5)',
} as const;

export type ColorKey = keyof typeof colors;
