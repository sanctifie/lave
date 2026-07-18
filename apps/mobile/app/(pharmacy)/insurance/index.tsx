import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { pharmacyService, InsuranceClaims } from '../../../src/services/pharmacy.service';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

function fcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
function providerLabel(p: string) { return p === 'cnamgs' ? 'CNAMGS' : p === 'cnss' ? 'CNSS' : p; }

export default function InsuranceScreen() {
  const router = useRouter();
  const [data, setData] = useState<InsuranceClaims | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await pharmacyService.insuranceClaims()); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const share = async () => {
    if (!data) return;
    const lines = data.rows.map(
      (r) => `#${r.orderId.slice(-6).toUpperCase()} · ${formatDate(r.createdAt)} · ${r.patientName} · ${providerLabel(r.provider)} ${r.coverageRate}% · ${fcfa(r.caisseShareFcfa)}`,
    );
    const body =
      `BORDEREAU TIERS-PAYANT\n` +
      `Total à récupérer : ${fcfa(data.totalFcfa)} (${data.count} commande(s))\n\n` +
      lines.join('\n');
    await Share.share({ message: body });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable>
        <Text style={styles.pageTitle}>Tiers-payant</Text>
        <View style={{ width: 56 }} />
      </View>

      {loading || !data ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <>
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>🧾 À récupérer auprès des caisses</Text>
            <Text style={styles.heroValue}>{fcfa(data.totalFcfa)}</Text>
            <Text style={styles.heroHint}>{data.count} commande(s) avec part tiers-payant.</Text>
          </View>

          {Object.keys(data.byProvider).length > 0 && (
            <View style={styles.providerCard}>
              {Object.entries(data.byProvider).map(([prov, amt]) => (
                <View key={prov} style={styles.providerRow}>
                  <Text style={styles.providerName}>{providerLabel(prov)}</Text>
                  <Text style={styles.providerAmt}>{fcfa(amt)}</Text>
                </View>
              ))}
            </View>
          )}

          {data.rows.length > 0 && (
            <Pressable style={styles.shareBtn} onPress={share}>
              <Text style={styles.shareTxt}>📤 Partager / exporter le bordereau</Text>
            </Pressable>
          )}

          <Text style={styles.sectionTitle}>Détail des créances</Text>
          {data.rows.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyTxt}>Aucune créance tiers-payant pour l'instant.</Text></View>
          ) : (
            data.rows.map((r) => (
              <View key={r.orderId} style={styles.rowCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.claimName}>{r.patientName}</Text>
                  <Text style={styles.claimMeta}>
                    #{r.orderId.slice(-6).toUpperCase()} · {formatDate(r.createdAt)} · {providerLabel(r.provider)} {r.coverageRate}%
                  </Text>
                </View>
                <Text style={styles.claimAmt}>{fcfa(r.caisseShareFcfa)}</Text>
              </View>
            ))
          )}
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

  heroCard: { backgroundColor: colors.accent, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.xs, ...shadows.modal },
  heroLabel: { ...typography.caption, color: 'rgba(255,255,255,0.85)' },
  heroValue: { ...typography.h1, color: colors.textOnDark },
  heroHint:  { ...typography.caption, color: 'rgba(255,255,255,0.85)', marginTop: spacing.xs },

  providerCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm, ...shadows.card },
  providerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  providerName: { ...typography.bodyMedium, color: colors.text },
  providerAmt:  { ...typography.bodyMedium, color: colors.accent },

  shareBtn: { backgroundColor: colors.primarySurface, borderRadius: radii.full, paddingVertical: spacing.sm, alignItems: 'center' },
  shareTxt: { ...typography.label, color: colors.primary },

  sectionTitle: { ...typography.bodyMedium, color: colors.text, marginTop: spacing.xs },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, ...shadows.card },
  claimName: { ...typography.bodyMedium, color: colors.text },
  claimMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  claimAmt:  { ...typography.bodyMedium, color: colors.accent },

  empty: { alignItems: 'center', padding: spacing.lg },
  emptyTxt: { ...typography.body, color: colors.textSecondary },
});
