import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { pharmacyService, DispensingRecord } from '../../../src/services/pharmacy.service';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

function fcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }
function fdate(iso: string) { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }

/** Ordonnancier légal : registre des stupéfiants dispensés (lecture + export). */
export default function RegisterScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<DispensingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await pharmacyService.register()); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const share = async () => {
    const body = 'ORDONNANCIER — STUPÉFIANTS\n' + rows.map((r) =>
      `n°${r.seq} · ${fdate(r.createdAt)} · ${r.patientName} · ${r.medication} ×${r.quantity} · ${fcfa(r.priceFcfa)} · Prescrit par ${r.prescriberName}`,
    ).join('\n');
    await Share.share({ message: body });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable>
        <Text style={styles.pageTitle}>Ordonnancier</Text>
        <View style={{ width: 56 }} />
      </View>
      <Text style={styles.intro}>
        Registre légal des stupéfiants dispensés. Chaque inscription porte le n° d'ordre, la date,
        le patient, le médicament, la quantité, le prix et le médecin prescripteur.
      </Text>
      {rows.length > 0 && (
        <Pressable style={styles.shareBtn} onPress={share}>
          <Text style={styles.shareTxt}>📤 Exporter le registre</Text>
        </Pressable>
      )}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : rows.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyTxt}>Aucun stupéfiant dispensé pour l'instant.</Text></View>
      ) : (
        rows.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.seqBadge}><Text style={styles.seqTxt}>n°{r.seq}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.med}>{r.medication} ×{r.quantity}</Text>
              <Text style={styles.meta}>{r.patientName} · {fdate(r.createdAt)} · {fcfa(r.priceFcfa)}</Text>
              <Text style={styles.presc}>Prescrit par {r.prescriberName}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.xl },
  back: { ...typography.bodyMedium, color: colors.primary },
  pageTitle: { ...typography.h3, color: colors.text },
  intro: { ...typography.caption, color: colors.textSecondary },
  shareBtn: { backgroundColor: colors.primarySurface, borderRadius: radii.full, paddingVertical: spacing.sm, alignItems: 'center' },
  shareTxt: { ...typography.label, color: colors.primary },
  empty: { alignItems: 'center', padding: spacing.lg },
  emptyTxt: { ...typography.body, color: colors.textSecondary },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md,
    ...shadows.card, borderLeftWidth: 4, borderLeftColor: colors.warning,
  },
  seqBadge: { backgroundColor: colors.warningSurface, borderRadius: radii.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  seqTxt: { ...typography.label, color: colors.warning },
  med: { ...typography.bodyMedium, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  presc: { ...typography.small, color: colors.textDisabled, marginTop: 2 },
});
