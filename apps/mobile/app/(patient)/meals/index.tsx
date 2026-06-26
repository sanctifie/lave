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
import { mealsService, MealPlan } from '../../../src/services/meals.service';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }

export default function MealsScreen() {
  const router  = useRouter();
  const [plans, setPlans]   = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try { setPlans(await mealsService.listPlans()); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Repas & Nutrition</Text>
        <Text style={styles.subtitle}>Menus diététiques livrés à domicile</Text>
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
          data={plans}
          keyExtractor={(p) => p.id}
          contentContainerStyle={plans.length === 0 ? styles.center : styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 48 }}>🥗</Text>
              <Text style={styles.emptyText}>Aucun menu disponible pour le moment</Text>
              <Text style={styles.emptyHint}>Revenez prochainement !</Text>
            </View>
          }
          renderItem={({ item: plan }) => {
            const totalItems = plan.items.length;
            const totalFcfa  = plan.items.reduce((s, i) => s + i.unitPriceFcfa, 0);
            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/(patient)/meals/${plan.id}` as never)}
              >
                <View style={styles.cardTop}>
                  <View style={styles.iconBox}>
                    <Text style={{ fontSize: 28 }}>🍽️</Text>
                  </View>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text style={styles.planName} numberOfLines={1}>{plan.name}</Text>
                    {plan.description ? (
                      <Text style={styles.planDesc} numberOfLines={2}>{plan.description}</Text>
                    ) : null}
                    <Text style={styles.itemCount}>{totalItems} article{totalItems > 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.priceBox}>
                    <Text style={styles.price}>{formatFcfa(totalFcfa)}</Text>
                    <Text style={styles.priceHint}>+ livraison</Text>
                  </View>
                </View>

                {plan.items.slice(0, 3).length > 0 && (
                  <View style={styles.itemPreview}>
                    {plan.items.slice(0, 3).map((item) => (
                      <View key={item.id} style={styles.itemPill}>
                        <Text style={styles.itemPillText} numberOfLines={1}>{item.name}</Text>
                      </View>
                    ))}
                    {plan.items.length > 3 && (
                      <View style={styles.itemPill}>
                        <Text style={styles.itemPillText}>+{plan.items.length - 3}</Text>
                      </View>
                    )}
                  </View>
                )}
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
    gap: spacing.xs,
  },
  title:    { ...typography.h3, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textSecondary },

  list:   { padding: spacing.md, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  iconBox: {
    width: 56, height: 56, borderRadius: radii.md,
    backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center',
  },
  planName:  { ...typography.bodyMedium, color: colors.text },
  planDesc:  { ...typography.caption, color: colors.textSecondary },
  itemCount: { ...typography.caption, color: colors.primary },
  priceBox:  { alignItems: 'flex-end', gap: 2 },
  price:     { ...typography.bodyMedium, color: colors.text },
  priceHint: { ...typography.small, color: colors.textDisabled },

  itemPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  itemPill: {
    backgroundColor: colors.background,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemPillText: { ...typography.small, color: colors.textSecondary },

  emptyBox:  { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
  emptyHint: { ...typography.caption, color: colors.textDisabled },
  retryBtn:  { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.primary },
  retryText: { ...typography.label, color: colors.primary },
});
