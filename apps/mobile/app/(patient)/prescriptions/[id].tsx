import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PrescriptionStatus } from '@mbolo/shared';
import {
  prescriptionsService,
  PrescriptionDetail,
} from '../../../src/services/prescriptions.service';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { API_URL } from '../../../src/services/client';
import { useAuthStore } from '../../../src/store/auth.store';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function formatFcfa(n: number) {
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

export default function PrescriptionDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const [rx, setRx]           = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [renewing, setRenewing] = useState(false);

  const handleRenew = useCallback(async () => {
    setRenewing(true);
    try {
      const created = await prescriptionsService.renew(id);
      Alert.alert(
        'Renouvellement envoyé',
        'Votre demande a été transmise à la pharmacie. Vous serez notifié dès qu\'elle sera validée.',
        [{ text: 'Voir', onPress: () => router.replace(`/(patient)/prescriptions/${created.id}` as never) }],
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Renouvellement impossible. Réessayez.';
      Alert.alert('Erreur', msg);
    } finally {
      setRenewing(false);
    }
  }, [id]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await prescriptionsService.getById(id);
      setRx(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <ActivityIndicator style={styles.center} color={colors.primary} />;
  }

  if (error || !rx) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Impossible de charger l'ordonnance.</Text>
        <Pressable onPress={load} style={styles.retryBtn}>
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  const isRejected = rx.status === PrescriptionStatus.REJECTED;
  const isPending  = rx.status === PrescriptionStatus.PENDING_VALIDATION;
  const isRenewable = [
    PrescriptionStatus.VALIDATED,
    PrescriptionStatus.PARTIALLY_FILLED,
    PrescriptionStatus.FILLED,
  ].includes(rx.status as PrescriptionStatus);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Retour</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Ordonnance</Text>
        <View style={{ width: 56 }} />
      </View>

      {/* Info card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Pharmacie</Text>
          <Text style={styles.infoValue}>{rx.targetPartnerName ?? '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Envoyée le</Text>
          <Text style={styles.infoValue}>{formatDate(rx.createdAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Statut</Text>
          <StatusBadge status={rx.status as PrescriptionStatus} />
        </View>
      </View>

      {/* Bannière en attente */}
      {isPending && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingIcon}>⏳</Text>
          <Text style={styles.pendingText}>
            Votre ordonnance est en cours d'examen par la pharmacie. Vous serez notifié dès qu'elle sera traitée.
          </Text>
        </View>
      )}

      {/* Motif de refus */}
      {isRejected && rx.rejectionReason && (
        <View style={styles.rejectionCard}>
          <Text style={styles.rejectionTitle}>Motif de refus</Text>
          <Text style={styles.rejectionText}>{rx.rejectionReason}</Text>
        </View>
      )}

      {/* Notes patient */}
      {rx.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{rx.notes}</Text>
          </View>
        </View>
      )}

      {/* Scan(s) */}
      {rx.mediaUrls.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scan de l'ordonnance</Text>
          {rx.mediaUrls.map((url, i) => {
            // Les scans sont des données de santé servies derrière auth :
            // on passe le JWT en query (l'Image RN et le navigateur externe
            // ne peuvent pas envoyer d'en-tête Authorization).
            const base    = url.startsWith('http') ? url : `${API_URL}${url}`;
            const token   = useAuthStore.getState().token;
            const fullUrl = token ? `${base}${base.includes('?') ? '&' : '?'}token=${token}` : base;
            const isPdf   = url.toLowerCase().endsWith('.pdf');
            return isPdf ? (
              <Pressable
                key={i}
                style={styles.pdfBtn}
                onPress={() => Linking.openURL(fullUrl)}
              >
                <Text style={styles.pdfIcon}>📄</Text>
                <Text style={styles.pdfText}>Voir le PDF</Text>
              </Pressable>
            ) : (
              <Pressable key={i} onPress={() => Linking.openURL(fullUrl)}>
                <Image
                  source={{ uri: fullUrl }}
                  style={styles.scanImage}
                  resizeMode="cover"
                />
                <Text style={styles.scanHint}>Appuyer pour agrandir</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Traitement chronique : renouvellement + rappels de prise */}
      {isRenewable && (
        <View style={styles.careCard}>
          <Text style={styles.careTitle}>Suivi de traitement</Text>
          <Text style={styles.careHint}>
            Traitement au long cours ? Renouvelez cette ordonnance en un geste ou
            programmez des rappels de prise.
          </Text>
          <View style={styles.careBtns}>
            <Pressable
              style={[styles.careBtn, styles.careBtnPrimary, renewing && { opacity: 0.6 }]}
              disabled={renewing}
              onPress={handleRenew}
            >
              <Text style={styles.careBtnPrimaryTxt}>
                {renewing ? 'Envoi…' : '🔄 Renouveler'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.careBtn, styles.careBtnGhost]}
              onPress={() => router.push('/(patient)/reminders' as never)}
            >
              <Text style={styles.careBtnGhostTxt}>⏰ Rappels de prise</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Commande associée */}
      {rx.orderId && (
        <View style={styles.orderCard}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderLabel}>Commande créée</Text>
            {rx.orderTotalFcfa != null && (
              <Text style={styles.orderTotal}>{formatFcfa(rx.orderTotalFcfa)}</Text>
            )}
          </View>
          <Pressable
            style={styles.orderBtn}
            onPress={() => router.push('/(patient)/orders' as never)}
          >
            <Text style={styles.orderBtnText}>Voir mes commandes →</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  back:      { ...typography.bodyMedium, color: colors.primary },
  pageTitle: { ...typography.h3, color: colors.text },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  infoLabel: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  infoValue: { ...typography.bodyMedium, color: colors.text, flex: 2, textAlign: 'right' },

  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningSurface,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  pendingIcon: { fontSize: 18 },
  pendingText: { ...typography.body, color: colors.warning, flex: 1 },

  rejectionCard: {
    backgroundColor: colors.errorSurface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  rejectionTitle: { ...typography.label, color: colors.error },
  rejectionText:  { ...typography.body, color: colors.error },

  section:      { gap: spacing.sm },
  sectionTitle: { ...typography.bodyMedium, color: colors.text },

  notesBox:  {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    ...shadows.card,
  },
  notesText: { ...typography.body, color: colors.textSecondary },

  scanImage: {
    width: '100%',
    height: 200,
    borderRadius: radii.md,
    backgroundColor: colors.border,
  },
  scanHint: {
    ...typography.small,
    color: colors.textDisabled,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    ...shadows.card,
  },
  pdfIcon: { fontSize: 24 },
  pdfText: { ...typography.bodyMedium, color: colors.primary },

  careCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  careTitle: { ...typography.bodyMedium, color: colors.text },
  careHint:  { ...typography.caption, color: colors.textSecondary },
  careBtns:  { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  careBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    alignItems: 'center',
  },
  careBtnPrimary:    { backgroundColor: colors.primary },
  careBtnPrimaryTxt: { ...typography.label, color: colors.textOnDark },
  careBtnGhost:      { borderWidth: 1.5, borderColor: colors.accent },
  careBtnGhostTxt:   { ...typography.label, color: colors.accent },

  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  orderInfo:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderLabel: { ...typography.bodyMedium, color: colors.text },
  orderTotal: { ...typography.h3, color: colors.success },
  orderBtn: {
    backgroundColor: colors.primarySurface,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  orderBtnText: { ...typography.label, color: colors.primary },

  errorText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  retryText: { ...typography.label, color: colors.primary },
});
