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
import { useRouter } from 'expo-router';
import { mealsService, MealOrder } from '../../../src/services/meals.service';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

const STATUS_LABEL: Record<string, string> = {
  pending_assignment: 'En préparation',
  assigned:           'Coursier assigné',
  en_route_pickup:    'Récupération en cours',
  picked_up:          'Récupéré',
  en_route_delivery:  'En livraison',
  delivered:          'Livré',
  failed:             'Échec',
};

const STATUS_COLOR: Record<string, string> = {
  pending_assignment: colors.warning,
  assigned:           colors.info,
  en_route_pickup:    colors.info,
  picked_up:          colors.info,
  en_route_delivery:  colors.primary,
  delivered:          colors.success,
  failed:             colors.error,
};

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function MealOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders]       = useState<MealOrder[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setOrders(await mealsService.listMine()); }
    catch { /* silencieux */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Retour</Text>
        </Pressable>
        <Text style={styles.title}>Mes commandes repas</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.center} color={colors.primary} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={orders.length === 0 ? styles.center : styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 48 }}>🥗</Text>
              <Text style={styles.emptyText}>Aucune commande pour le moment</Text>
              <Pressable style={styles.browseBtn} onPress={() => router.replace('/(patient)/meals' as never)}>
                <Text style={styles.browseText}>Voir les menus</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item: order }) => {
            const status = order.delivery?.status ?? 'pending_assignment';
            const color  = STATUS_COLOR[status] ?? colors.textSecondary;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.iconBox}>
                    <Text style={{ fontSize: 24 }}>🍽️</Text>
                  </View>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text style={styles.planName} numberOfLines={1}>{order.mealPlan.name}</Text>
                    <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
                  </View>
                  <Text style={styles.total}>{formatFcfa(order.totalFcfa)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.statusText, { color }]}>{STATUS_LABEL[status] ?? status}</Text>
                </View>
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
    paddingTop:        spacing.xl,
    paddingBottom:     spacing.md,
    backgroundColor:   colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap:               spacing.xs,
  },
  backText: { ...typography.body, color: colors.primary },
  title:    { ...typography.h3, color: colors.text },

  list:   { padding: spacing.md, gap: spacing.md },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },

  card: {
    backgroundColor: colors.surface,
    borderRadius:    radii.lg,
    padding:         spacing.md,
    gap:             spacing.sm,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: {
    width: 48, height: 48, borderRadius: radii.md,
    backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center',
  },
  planName: { ...typography.bodyMedium, color: colors.text },
  date:     { ...typography.caption, color: colors.textSecondary },
  total:    { ...typography.bodyMedium, color: colors.primary },

  statusBadge: {
    alignSelf:         'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xs / 2,
    borderRadius:      radii.full,
  },
  statusText: { ...typography.small, fontWeight: '600' },

  emptyBox:  { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
  browseBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.full, backgroundColor: colors.primary },
  browseText:{ ...typography.label, color: colors.textOnDark },
});
