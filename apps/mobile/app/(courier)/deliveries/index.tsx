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
import { DeliveryStatus } from '@mbolo/shared';
import { deliveriesService, DeliveryItem } from '../../../src/services/deliveries.service';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

type Tab = 'available' | 'active' | 'done';

const AVAILABLE = new Set([DeliveryStatus.PENDING_ASSIGNMENT]);
const ACTIVE    = new Set([
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.EN_ROUTE_PICKUP,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.EN_ROUTE_DELIVERY,
]);

const TABS: { key: Tab; label: string }[] = [
  { key: 'available', label: 'Disponibles' },
  { key: 'active',    label: 'En cours'    },
  { key: 'done',      label: 'Terminées'   },
];

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }

export default function CourierDeliveriesScreen() {
  const router = useRouter();
  const [tab, setTab]             = useState<Tab>('available');
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await deliveriesService.list();
      setDeliveries(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = deliveries.filter((d) => {
    if (tab === 'available') return AVAILABLE.has(d.status as DeliveryStatus);
    if (tab === 'active')    return ACTIVE.has(d.status as DeliveryStatus);
    return d.status === DeliveryStatus.DELIVERED || d.status === DeliveryStatus.FAILED;
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes livraisons</Text>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.center} color={colors.primary} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Erreur de chargement</Text>
          <Pressable onPress={load} style={styles.retryBtn}><Text style={styles.retryText}>Réessayer</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(d) => d.id}
          contentContainerStyle={visible.length === 0 ? styles.center : styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🚚</Text>
              <Text style={styles.emptyText}>Aucune livraison ici</Text>
            </View>
          }
          renderItem={({ item: d }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/(courier)/deliveries/${d.id}` as never)}
            >
              <View style={styles.cardTop}>
                <View style={styles.iconBox}>
                  <Text style={{ fontSize: 22 }}>📦</Text>
                </View>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text style={styles.patient}>{d.patientName}</Text>
                  <Text style={styles.addr} numberOfLines={1}>{d.patientAddress}</Text>
                  <StatusBadge status={d.status as DeliveryStatus} />
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.total}>{formatFcfa(d.totalFcfa)}</Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.routeRow}>
                <Text style={styles.routeIcon}>🏪</Text>
                <Text style={styles.routeText} numberOfLines={1}>{d.pharmacyName}</Text>
              </View>
              <View style={styles.routeRow}>
                <Text style={styles.routeIcon}>📍</Text>
                <Text style={styles.routeText} numberOfLines={1}>{d.patientAddress}</Text>
              </View>
            </Pressable>
          )}
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
  },
  title: { ...typography.h3, color: colors.text },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive:     { borderBottomColor: colors.primary },
  tabText:       { ...typography.label, color: colors.textSecondary },
  tabTextActive: { color: colors.primary },

  list:   { padding: spacing.md, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardTop:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: {
    width: 48, height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  patient: { ...typography.bodyMedium, color: colors.text },
  addr:    { ...typography.caption, color: colors.textSecondary },
  cardRight: { alignItems: 'flex-end', gap: spacing.xs },
  total:     { ...typography.label, color: colors.primary },
  chevron:   { ...typography.h3, color: colors.textDisabled },

  divider: { height: 1, backgroundColor: colors.border },

  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  routeIcon: { fontSize: 14 },
  routeText: { ...typography.caption, color: colors.textSecondary, flex: 1 },

  emptyBox:  { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
  retryBtn:  { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.primary },
  retryText: { ...typography.label, color: colors.primary },
});
