import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { pharmacyService, PharmacyEarnings } from '../../../src/services/pharmacy.service';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

function fcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); }

const STATE_META: Record<string, { label: string; color: string; surface: string }> = {
  released: { label: 'Versé',       color: colors.success, surface: colors.successSurface },
  escrow:   { label: 'À verser',    color: colors.warning, surface: colors.warningSurface },
  pending:  { label: 'En attente',  color: colors.textSecondary, surface: colors.border },
};

export default function EarningsScreen() {
  const router = useRouter();
  const [data, setData] = useState<PharmacyEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await pharmacyService.earnings()); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable>
        <Text style={styles.pageTitle}>Encaissements</Text>
        <View style={{ width: 56 }} />
      </View>

      {loading || !data ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <>
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>💰 En séquestre — à vous être versé</Text>
            <Text style={styles.heroValue}>{fcfa(data.escrowFcfa)}</Text>
            <Text style={styles.heroHint}>Versé automatiquement après confirmation de livraison. Zéro impayé.</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.miniCard}>
              <Text style={[styles.miniValue, { color: colors.success }]}>{fcfa(data.releasedFcfa)}</Text>
              <Text style={styles.miniLabel}>Déjà versé</Text>
            </View>
            <View style={styles.miniCard}>
              <Text style={[styles.miniValue, { color: colors.textSecondary }]}>{fcfa(data.pendingFcfa)}</Text>
              <Text style={styles.miniLabel}>En attente de paiement</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Détail par commande</Text>
          {data.rows.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyTxt}>Aucune commande pour l'instant.</Text></View>
          ) : (
            data.rows.map((r) => {
              const meta = STATE_META[r.state];
              return (
                <View key={r.orderId} style={styles.rowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderRef}>Commande #{r.orderId.slice(-6).toUpperCase()}</Text>
                    <Text style={styles.orderDate}>{formatDate(r.createdAt)}</Text>
                  </View>
                  <Text style={styles.orderAmt}>{fcfa(r.dueFcfa)}</Text>
                  <View style={[styles.stateChip, { backgroundColor: meta.surface }]}>
                    <Text style={[styles.stateTxt, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
              );
            })
          )}
          <Text style={styles.legal}>
            ⚖️ La pharmacie perçoit 100 % du prix des médicaments — la plateforme ne prend aucune marge dessus.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  topBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.xl },
  back:      { ...typography.bodyMedium, color: colors.primary },
  pageTitle: { ...typography.h3, color: colors.text },

  heroCard: { backgroundColor: colors.primary, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.xs, ...shadows.modal },
  heroLabel: { ...typography.caption, color: colors.primaryLight },
  heroValue: { ...typography.h1, color: colors.textOnDark },
  heroHint:  { ...typography.caption, color: colors.primaryLight, marginTop: spacing.xs },

  row: { flexDirection: 'row', gap: spacing.sm },
  miniCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs, ...shadows.card },
  miniValue: { ...typography.bodyMedium },
  miniLabel: { ...typography.small, color: colors.textSecondary },

  sectionTitle: { ...typography.bodyMedium, color: colors.text, marginTop: spacing.xs },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, ...shadows.card },
  orderRef:  { ...typography.bodyMedium, color: colors.text },
  orderDate: { ...typography.caption, color: colors.textSecondary },
  orderAmt:  { ...typography.bodyMedium, color: colors.text },
  stateChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.full },
  stateTxt:  { ...typography.small },

  empty: { alignItems: 'center', padding: spacing.lg },
  emptyTxt: { ...typography.body, color: colors.textSecondary },
  legal: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
});
