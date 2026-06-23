import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { OrderStatus } from '@mbolo/shared';
import { ordersService, Order } from '../../../src/services/orders.service';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { fr } from '../../../src/i18n/fr';

type Tab = 'active' | 'done' | 'cancelled';

const ACTIVE_STATUSES = new Set<string>([
  OrderStatus.PENDING_PHARMACY,
  OrderStatus.PHARMACY_ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.DISPATCHED,
]);
const DONE_STATUSES = new Set<string>([OrderStatus.DELIVERED]);

const TABS: { key: Tab; label: string }[] = [
  { key: 'active',    label: 'En cours'   },
  { key: 'done',      label: 'Terminées'  },
  { key: 'cancelled', label: 'Annulées'   },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short',
  });
}

function formatFcfa(amount: number) {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

const STATUS_ICONS: Record<string, string> = {
  [OrderStatus.PENDING_PHARMACY]:   '⏳',
  [OrderStatus.PHARMACY_ACCEPTED]:  '✅',
  [OrderStatus.PREPARING]:          '🔧',
  [OrderStatus.READY_FOR_PICKUP]:   '📦',
  [OrderStatus.DISPATCHED]:         '🚚',
  [OrderStatus.DELIVERED]:          '🎉',
  [OrderStatus.PHARMACY_REJECTED]:  '❌',
  [OrderStatus.CANCELLED]:          '🚫',
};

export default function OrdersScreen() {
  const [tab, setTab]           = useState<Tab>('active');
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await ordersService.list();
      setOrders(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = orders.filter((o) => {
    if (tab === 'active')    return ACTIVE_STATUSES.has(o.status);
    if (tab === 'done')      return DONE_STATUSES.has(o.status);
    return o.status === OrderStatus.CANCELLED || o.status === OrderStatus.PHARMACY_REJECTED;
  });

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{fr.order.title}</Text>
      </View>

      {/* Tabs */}
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
          <Text style={styles.emptyText}>{fr.common.error}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>{fr.common.retry}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(o) => o.id}
          contentContainerStyle={visible.length === 0 ? styles.center : styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>{fr.order.empty}</Text>
            </View>
          }
          renderItem={({ item: order }) => (
            <View style={styles.card}>
              {/* Icon + date */}
              <View style={styles.cardTop}>
                <View style={styles.orderIconBox}>
                  <Text style={{ fontSize: 22 }}>{STATUS_ICONS[order.status] ?? '📦'}</Text>
                </View>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text style={styles.pharmacyName} numberOfLines={1}>
                    {order.pharmacyName ?? 'Pharmacie'}
                  </Text>
                  <Text style={styles.cardDate}>{formatDate(order.createdAt)}</Text>
                </View>
                <StatusBadge status={order.status as OrderStatus} />
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Total */}
              <View style={styles.cardBottom}>
                <Text style={styles.totalLabel}>{fr.order.total}</Text>
                <Text style={styles.totalAmount}>{formatFcfa(order.totalFcfa ?? 0)}</Text>
              </View>
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
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  orderIconBox: {
    width: 48, height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  pharmacyName: { ...typography.bodyMedium, color: colors.text },
  cardDate:     { ...typography.caption, color: colors.textSecondary },

  divider:     { height: 1, backgroundColor: colors.border },
  cardBottom:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel:  { ...typography.caption, color: colors.textSecondary },
  totalAmount: { ...typography.bodyMedium, color: colors.text },

  emptyBox:  { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  retryText: { ...typography.label, color: colors.primary },
});
