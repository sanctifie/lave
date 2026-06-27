import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { mealsService, MealPlan } from '../../../src/services/meals.service';
import { Button } from '../../../src/components/ui/Button';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

const DELIVERY_FEE = 500;

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }

export default function MealPlanDetailScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const router     = useRouter();
  const [plan, setPlan]     = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes]   = useState('');
  const [ordering, setOrdering] = useState(false);

  const load = useCallback(async () => {
    try { setPlan(await mealsService.getPlan(planId)); }
    catch { /* handled */ }
    finally { setLoading(false); }
  }, [planId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;
  if (!plan) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.textSecondary }}>Menu introuvable</Text>
    </View>
  );

  const availableItems = plan.items.filter((i) => i.isAvailable);
  const itemsTotal = availableItems.reduce((s, i) => s + i.unitPriceFcfa, 0);
  const grandTotal = itemsTotal + DELIVERY_FEE;

  const placeOrder = async () => {
    setOrdering(true);
    try {
      const order = await mealsService.placeOrder(plan.id, notes.trim() || undefined);
      router.replace({
        pathname: '/(patient)/meals/pay' as any,
        params: { mealOrderId: order.id, amount: String(order.totalFcfa) },
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de passer la commande. Réessayez.');
    } finally {
      setOrdering(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.backText} onPress={() => router.back()}>‹ Retour</Text>
        <Text style={styles.title}>{plan.name}</Text>
        {plan.description ? <Text style={styles.desc}>{plan.description}</Text> : null}
      </View>

      {/* Articles */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Contenu du menu</Text>
        {availableItems.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemDot} />
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemPrice}>{formatFcfa(item.unitPriceFcfa)}</Text>
          </View>
        ))}
        {plan.items.filter((i) => !i.isAvailable).length > 0 && (
          <Text style={styles.unavailableNote}>
            {plan.items.filter((i) => !i.isAvailable).length} article(s) temporairement indisponible(s)
          </Text>
        )}
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notes (optionnel)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Allergies, préférences, instructions de livraison…"
          placeholderTextColor={colors.textDisabled}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Récapitulatif */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Récapitulatif</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Repas</Text>
          <Text style={styles.summaryValue}>{formatFcfa(itemsTotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Livraison</Text>
          <Text style={styles.summaryValue}>{formatFcfa(DELIVERY_FEE)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatFcfa(grandTotal)}</Text>
        </View>
      </View>

      <Button
        label={`Commander — ${formatFcfa(grandTotal)}`}
        loading={ordering}
        onPress={placeOrder}
        disabled={availableItems.length === 0}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },

  header: {
    paddingTop: spacing.xl,
    gap: spacing.xs,
  },
  backText: { ...typography.body, color: colors.primary },
  title:    { ...typography.h2, color: colors.text },
  desc:     { ...typography.body, color: colors.textSecondary },

  section:      { gap: spacing.sm },
  sectionLabel: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase' },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  itemDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  itemName: { ...typography.body, color: colors.text, flex: 1 },
  itemPrice:{ ...typography.bodyMedium, color: colors.text },
  unavailableNote: { ...typography.caption, color: colors.textDisabled, fontStyle: 'italic' },

  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    height: 80,
    ...typography.body as any,
    color: colors.text,
  },

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  summaryTitle: { ...typography.bodyMedium, color: colors.text },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { ...typography.body, color: colors.textSecondary },
  summaryValue: { ...typography.body, color: colors.text },
  totalRow:     { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs },
  totalLabel:   { ...typography.bodyMedium, color: colors.text },
  totalValue:   { ...typography.bodyMedium, color: colors.primary },
});
