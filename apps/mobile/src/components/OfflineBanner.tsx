import React, { useEffect } from 'react';
import { Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { apiClient } from '../services/client';
import { useNetworkStore } from '../store/network.store';
import { colors, spacing, typography } from '../theme';

// Hauteur approximative de la barre de statut, pour que le bandeau ne passe pas
// dessous (on évite une dépendance native supplémentaire).
const STATUS_BAR = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ?? 24);

/**
 * Bandeau « hors-ligne » global. L'état réseau est alimenté par les
 * intercepteurs axios ; on ajoute ici une sonde légère (/health) qui, une fois
 * hors-ligne, vérifie périodiquement le retour du réseau pour masquer le bandeau
 * et laisser l'app resynchroniser.
 */
export function OfflineBanner() {
  const isOnline = useNetworkStore((s) => s.isOnline);

  useEffect(() => {
    if (isOnline) return;
    const timer = setInterval(() => {
      apiClient.get('/health', { timeout: 4000 }).catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [isOnline]);

  if (isOnline) return null;

  return (
    <View style={[styles.banner, { paddingTop: STATUS_BAR + spacing.xs }]}>
      <Text style={styles.text}>📴 Hors-ligne — affichage des dernières données connues</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 999,
    backgroundColor: colors.text,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  text: { ...typography.caption, color: colors.textOnDark },
});
