import { TextStyle } from 'react-native';

export const typography: Record<string, TextStyle> = {
  h1:         { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2:         { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h3:         { fontSize: 18, fontWeight: '600', lineHeight: 26 },
  body:       { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMedium: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
  caption:    { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  small:      { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  label:      { fontSize: 12, fontWeight: '600', lineHeight: 16, letterSpacing: 0.5 },
};
