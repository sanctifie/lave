import React from 'react';
import { Pressable, Text, View } from 'react-native';

/** Sélecteur d'étoiles 1→5 (ou affichage seul si onChange absent). */
export function StarRating({ value, onChange, size = 30 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={onChange ? () => onChange(n) : undefined} disabled={!onChange} hitSlop={6}>
          <Text style={{ fontSize: size, color: n <= value ? '#E8890C' : '#D9D9D9' }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}
