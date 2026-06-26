import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ridesService, Ride } from '../../../src/services/rides.service';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

type Tab = 'available' | 'mine';

const STATUS_LABEL: Record<string, string> = {
  pending:   'En attente',
  assigned:  'Assigné',
  en_route:  'En route',
  arrived:   'Arrivé',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }

export default function CourierRidesScreen() {
  const router  = useRouter();
  const [tab, setTab]   = useState<Tab>('available');
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'available') setRides(await ridesService.listAvailable());
      else {
        const { data } = await (await import('../../../src/services/client')).apiClient.get('/rides/courier/mine');
        setRides(data.data);
      }
    } catch { /* silencieux */ }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const accept = async (rideId: string) => {
    try {
      await ridesService.accept(rideId);
      Alert.alert('Course acceptée !', 'Rendez-vous au point de départ du patient.');
      load();
    } catch {
      Alert.alert('Erreur', 'Impossible d\'accepter cette course.');
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Courses</Text>
      </View>

      <View style={styles.tabRow}>
        {(['available', 'mine'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'available' ? 'Disponibles' : 'Mes courses'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.center} color={colors.primary} />
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(r) => r.id}
          contentContainerStyle={rides.length === 0 ? styles.center : styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 40 }}>🚗</Text>
              <Text style={styles.emptyText}>Aucune course disponible</Text>
            </View>
          }
          renderItem={({ item: ride }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconBox}>
                  <Text style={{ fontSize: 22 }}>🚗</Text>
                </View>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text style={styles.route} numberOfLines={1}>
                    {ride.request?.originLandmark ?? '—'} → {ride.request?.destLandmark ?? '—'}
                  </Text>
                  <Text style={styles.status}>{STATUS_LABEL[ride.status] ?? ride.status}</Text>
                </View>
                <Text style={styles.fare}>{formatFcfa(ride.fareEstFcfa)}</Text>
              </View>

              {tab === 'available' && ride.status === 'pending' && (
                <Pressable style={styles.acceptBtn} onPress={() => accept(ride.id)}>
                  <Text style={styles.acceptText}>Accepter la course</Text>
                </Pressable>
              )}

              {tab === 'mine' && (
                <Pressable
                  style={styles.detailBtn}
                  onPress={() => router.push(`/(courier)/rides/${ride.id}` as never)}
                >
                  <Text style={styles.detailText}>Voir le détail →</Text>
                </Pressable>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { ...typography.h3, color: colors.text },

  tabRow: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab:    { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: colors.primary },
  tabText:       { ...typography.label, color: colors.textSecondary },
  tabTextActive: { color: colors.primary },

  list:   { padding: spacing.md, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm, ...shadows.card },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' },
  route:  { ...typography.bodyMedium, color: colors.text },
  status: { ...typography.caption, color: colors.textSecondary },
  fare:   { ...typography.bodyMedium, color: colors.text },

  acceptBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: 'center' },
  acceptText: { ...typography.label, color: colors.textOnDark },
  detailBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: 'center' },
  detailText: { ...typography.label, color: colors.primary },

  emptyBox: { alignItems: 'center', gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.textSecondary },
});
