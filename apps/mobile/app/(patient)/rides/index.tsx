import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ridesService, RideRequest } from '../../../src/services/rides.service';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

const RIDE_TYPE_LABEL: Record<string, string> = {
  home:     'Domicile',
  hospital: 'Hôpital',
  exam:     'Examen',
};

const STATUS_ICON: Record<string, string> = {
  pending:   '🕐',
  assigned:  '🚗',
  en_route:  '🚗',
  arrived:   '📍',
  completed: '✅',
  cancelled: '❌',
};

const STATUS_LABEL: Record<string, string> = {
  pending:   'En attente de chauffeur',
  assigned:  'Chauffeur assigné',
  en_route:  'En route',
  arrived:   'Arrivé',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function formatFcfa(n: number) {
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

export default function RidesScreen() {
  const router = useRouter();
  const [rides, setRides]   = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try { setRides(await ridesService.listMine()); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes transports</Text>
        <Pressable
          style={styles.newBtn}
          onPress={() => router.push('/(patient)/rides/new' as never)}
        >
          <Text style={styles.newBtnText}>+ Nouvelle course</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.center} color={colors.primary} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Une erreur est survenue</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(r) => r.id}
          contentContainerStyle={rides.length === 0 ? styles.center : styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 48 }}>🚗</Text>
              <Text style={styles.emptyText}>Aucune course pour le moment</Text>
              <Pressable
                style={styles.newBtn}
                onPress={() => router.push('/(patient)/rides/new' as never)}
              >
                <Text style={styles.newBtnText}>Demander un transport</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item: req }) => {
            const ride = req.ride;
            const status = ride?.status ?? 'pending';
            return (
              <Pressable
                style={styles.card}
                onPress={() => ride && router.push(`/(patient)/rides/${ride.id}` as never)}
              >
                <View style={styles.cardTop}>
                  <View style={styles.iconBox}>
                    <Text style={{ fontSize: 22 }}>{STATUS_ICON[status]}</Text>
                  </View>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text style={styles.typeLabel}>{RIDE_TYPE_LABEL[req.type] ?? req.type}</Text>
                    <Text style={styles.route} numberOfLines={1}>
                      {req.originLandmark} → {req.destLandmark}
                    </Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.statusText}>{STATUS_LABEL[status] ?? status}</Text>
                    {ride?.fareEstFcfa ? (
                      <Text style={styles.fare}>{formatFcfa(ride.fareEstFcfa)}</Text>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.date}>{formatDate(req.createdAt)}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...typography.h3, color: colors.text },

  newBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  newBtnText: { ...typography.label, color: colors.textOnDark },

  list:   { padding: spacing.md, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: {
    width: 48, height: 48, borderRadius: radii.md,
    backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center',
  },
  typeLabel:  { ...typography.bodyMedium, color: colors.text },
  route:      { ...typography.caption, color: colors.textSecondary },
  right:      { alignItems: 'flex-end', gap: spacing.xs },
  statusText: { ...typography.caption, color: colors.primary },
  fare:       { ...typography.bodyMedium, color: colors.text },
  date:       { ...typography.caption, color: colors.textDisabled },

  emptyBox:  { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
  retryBtn:  { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.primary },
  retryText: { ...typography.label, color: colors.primary },
});
