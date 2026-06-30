import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiClient } from '../../../src/services/client';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

interface KitchenOrder {
  id: string;
  totalFcfa: number;
  deliveryFeeFcfa: number;
  notes: string | null;
  createdAt: string;
  mealPlan: { name: string };
  delivery: { status: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending_assignment: 'En attente coursier',
  assigned:           'Coursier assigné',
  en_route_pickup:    'En route (pickup)',
  picked_up:          'Récupéré',
  en_route_delivery:  'En livraison',
  delivered:          'Livré',
  failed:             'Échec',
};

const STATUS_COLOR: Record<string, string> = {
  pending_assignment: '#D97706',
  assigned:           '#2563EB',
  en_route_pickup:    '#7C3AED',
  picked_up:          '#0891B2',
  en_route_delivery:  '#6366F1',
  delivered:          '#16A34A',
  failed:             '#DC2626',
};

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function KitchenMealsScreen() {
  const [orders, setOrders]       = useState<KitchenOrder[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await apiClient.get('/meals/orders/kitchen');
      setOrders(data.data ?? []);
    } catch { /* silencieux */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const pending   = orders.filter((o) => !o.delivery || o.delivery.status === 'pending_assignment');
  const inProgress = orders.filter((o) => o.delivery && !['delivered', 'failed', 'pending_assignment'].includes(o.delivery.status));
  const done       = orders.filter((o) => o.delivery?.status === 'delivered');

  return (
    <FlatList
      style={styles.root}
      data={orders}
      keyExtractor={(o) => o.id}
      contentContainerStyle={orders.length === 0 ? styles.center : styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Commandes cuisine</Text>
          <View style={styles.statsRow}>
            {[
              { label: 'À préparer', count: pending.length,     color: colors.warning },
              { label: 'En livraison', count: inProgress.length, color: colors.primary },
              { label: 'Livrées',      count: done.length,       color: colors.success },
            ].map((s) => (
              <View key={s.label} style={styles.statPill}>
                <Text style={[styles.statCount, { color: s.color }]}>{s.count}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={{ fontSize: 40 }}>🥗</Text>
          <Text style={styles.emptyText}>Aucune commande repas</Text>
        </View>
      }
      renderItem={({ item: order }) => {
        const deliveryStatus = order.delivery?.status ?? 'pending_assignment';
        const statusColor = STATUS_COLOR[deliveryStatus] ?? colors.textSecondary;
        const isNew = !order.delivery || order.delivery.status === 'pending_assignment';

        return (
          <View style={[styles.card, isNew && styles.cardNew]}>
            <View style={styles.cardTop}>
              <View style={styles.iconBox}>
                <Text style={{ fontSize: 22 }}>🥗</Text>
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={styles.planName}>{order.mealPlan.name}</Text>
                <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
              </View>
              <Text style={styles.total}>{formatFcfa(order.totalFcfa)}</Text>
            </View>

            <View style={styles.cardBottom}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {STATUS_LABEL[deliveryStatus] ?? deliveryStatus}
                </Text>
              </View>
              {order.notes && (
                <Text style={styles.notes} numberOfLines={1}>📝 {order.notes}</Text>
              )}
            </View>

            {isNew && (
              <View style={styles.newBanner}>
                <Text style={styles.newBannerText}>⚡ Nouvelle commande — à préparer</Text>
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.md, gap: spacing.md },

  header: { marginBottom: spacing.sm, gap: spacing.sm },
  title:  { ...typography.h3, color: colors.text, paddingTop: spacing.xl },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statPill: {
    flex:            1,
    backgroundColor: colors.surface,
    borderRadius:    radii.lg,
    padding:         spacing.sm,
    alignItems:      'center',
    ...shadows.card,
  },
  statCount: { ...typography.h3, lineHeight: 28 },
  statLabel: { ...typography.small, color: colors.textSecondary, textAlign: 'center' },

  card: {
    backgroundColor: colors.surface,
    borderRadius:    radii.lg,
    padding:         spacing.md,
    gap:             spacing.sm,
    ...shadows.card,
  },
  cardNew: { borderLeftWidth: 3, borderLeftColor: colors.warning },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: {
    width: 48, height: 48,
    borderRadius:    radii.md,
    backgroundColor: '#FEF9C3',
    alignItems:      'center',
    justifyContent:  'center',
  },
  planName: { ...typography.bodyMedium, color: colors.text },
  date:     { ...typography.caption, color: colors.textSecondary },
  total:    { ...typography.bodyMedium, color: colors.primary },

  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xs / 2,
    borderRadius:      radii.full,
  },
  statusText: { ...typography.small, fontWeight: '600' },
  notes:      { ...typography.caption, color: colors.textSecondary, flex: 1 },

  newBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius:    radii.md,
    padding:         spacing.sm,
    alignItems:      'center',
  },
  newBannerText: { ...typography.caption, color: '#92400E', fontWeight: '600' },

  emptyBox:  { alignItems: 'center', gap: spacing.md, paddingTop: 80 },
  emptyText: { ...typography.bodyMedium, color: colors.textSecondary },
});
