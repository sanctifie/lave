export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const radii = {
  sm:   4,
  md:   8,
  lg:   16,
  xl:   24,
  full: 9999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#08312E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  modal: {
    shadowColor: '#08312E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  // Ombre « glow » teal pour les CTA primaires
  button: {
    shadowColor: '#0E9384',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;
