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
import { OrderStatus } from '@mbolo/shared';
import { pharmacyService, PharmacyOrder } from '../../../src/services/pharmacy.service';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

type Tab = 'active' | 'ready' | 'done';

const TABS: { key: Tab; label: string }[] = [
  { key: 'active', label: 'En préparation' },
  { key: 'ready',  label: 'Prêtes'         },
  { key: 'done',   label: 'Livrées'        },
];

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const NEXT_ACTION: Partial<Record<OrderStatus, { label: string; action: 'prepare' | 'ready' | 'reject'; variant: 'primary' | 'danger' }>> = {
  [OrderStatus.PENDING_PHARMACY]:  { label: 'Accepter et préparer',    action: 'prepare', variant: 'primary' },
  [OrderStatus.PHARMACY_ACCEPTED]: { label: 'Commencer la préparation', action: 'prepare', variant: 'primary' },
  [OrderStatus.PREPARING]:         { label: 'Marquer prête',            action: 'ready',   variant: 'primary' },
};

export default function PharmacyOrdersScreen() {
  const [tab, setTab]         = useState<Tab>('active');
  const [orders, setOrders]   = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await pharmacyService.listOrders();
      setOrders(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = orders.filter((o) => {
    if (tab === 'active') return [OrderStatus.PENDING_PHARMACY, OrderStatus.PHARMACY_ACCEPTED, OrderStatus.PREPARING].includes(o.status as OrderStatus);
    if (tab === 'ready')  return o.status === OrderStatus.READY_FOR_PICKUP;
    return [OrderStatus.DISPATCHED, OrderStatus.DELIVERED].includes(o.status as OrderStatus);
  });

  const doAction = async (order: PharmacyOrder, action: 'prepare' | 'ready' | 'reject') => {
    try {
      await pharmacyService.orderAction(order.id, action);
      await load();
    } catch {
      Alert.alert('Erreur', 'Action impossible. Réessayez.');
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Commandes</Text>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.center} color={colors.primary} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Erreur de chargement</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Réessayer</Text>
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
              <Text style={styles.emptyIcon}>💊</Text>
              <Text style={styles.emptyText}>Aucune commande ici</Text>
            </View>
          }
          renderItem={({ item: order }) => {
            const next = NEXT_ACTION[order.status as OrderStatus];
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.iconBox}>
                    <Text style={{ fontSize: 22 }}>💊</Text>
                  </View>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text style={styles.patient}>{order.patientName}</Text>
                    <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
                    <StatusBadge status={order.status as OrderStatus} />
                  </View>
                  <Text style={styles.total}>{formatFcfa(order.totalFcfa)}</Text>
                </View>

                {/* Items */}
                <View style={styles.divider} />
                {order.items.slice(0, 3).map((it, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName}>• {it.name}</Text>
                    <Text style={styles.itemQty}>×{it.quantity}</Text>
                  </View>
                ))}
                {order.items.length > 3 && (
                  <Text style={styles.moreItems}>+{order.items.length - 3} autres</Text>
                )}

                {/* Action */}
                {next && (
                  <>
                    <View style={styles.divider} />
                    <Pressable
                      style={[styles.actionBtn, next.variant === 'danger' && styles.actionBtnDanger]}
                      onPress={() => doAction(order, next.action)}
                    >
                      <Text style={[styles.actionBtnText, next.variant === 'danger' && styles.actionBtnTextDanger]}>
                        {next.label}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
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
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  iconBox: {
    width: 48, height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  patient: { ...typography.bodyMedium, color: colors.text },
  date:    { ...typography.caption, color: colors.textSecondary },
  total:   { ...typography.bodyMedium, color: colors.primary },

  divider: { height: 1, backgroundColor: colors.border },

  itemRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  itemName:  { ...typography.caption, color: colors.text, flex: 1 },
  itemQty:   { ...typography.caption, color: colors.textSecondary },
  moreItems: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic' },

  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  actionBtnDanger:     { backgroundColor: colors.error },
  actionBtnText:       { ...typography.label, color: colors.textOnDark },
  actionBtnTextDanger: { color: colors.textOnDark },

  emptyBox:  { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
  retryBtn:  { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.primary },
  retryText: { ...typography.label, color: colors.primary },
});
