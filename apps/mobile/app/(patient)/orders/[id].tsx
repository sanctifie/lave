import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OrderStatus, DeliveryStatus } from '@mbolo/shared';
import { ordersService, OrderDetail } from '../../../src/services/orders.service';
import { paymentsService } from '../../../src/services/payments.service';
import { apiClient } from '../../../src/services/client';
import { useAuthStore } from '../../../src/store/auth.store';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { fr } from '../../../src/i18n/fr';

type PayStep = 'idle' | 'pending' | 'success' | 'failed';

const POLL_MS  = 3000;
const MAX_POLL = 20;

function formatFcfa(n: number) {
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

const STATUS_STEPS = [
  { statuses: [OrderStatus.PENDING_PHARMACY],                              label: 'En attente de la pharmacie', icon: '⏳' },
  { statuses: [OrderStatus.PHARMACY_ACCEPTED],                             label: 'Acceptée',                   icon: '✅' },
  { statuses: [OrderStatus.PREPARING],                                     label: 'En préparation',             icon: '🔧' },
  { statuses: [OrderStatus.READY_FOR_PICKUP],                              label: 'Prête',                      icon: '📦' },
  { statuses: [OrderStatus.DISPATCHED],                                    label: 'En livraison',               icon: '🚚' },
  { statuses: [OrderStatus.DELIVERED],                                     label: 'Livrée',                     icon: '🎉' },
];

const ORDER_RANK: Record<string, number> = {
  [OrderStatus.PENDING_PHARMACY]:  0,
  [OrderStatus.PHARMACY_ACCEPTED]: 1,
  [OrderStatus.PREPARING]:         2,
  [OrderStatus.READY_FOR_PICKUP]:  3,
  [OrderStatus.DISPATCHED]:        4,
  [OrderStatus.DELIVERED]:         5,
};

export default function OrderDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const user     = useAuthStore((s) => s.user);

  const [order,        setOrder]        = useState<OrderDetail | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);

  // Paiement
  const [phone,        setPhone]        = useState(user?.phone ?? '');
  const [payStep,      setPayStep]      = useState<PayStep>('idle');
  const [paying,       setPaying]       = useState(false);
  const pollCount = useRef(0);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const [subChoice,    setSubChoice]    = useState<Record<string, boolean>>({});
  const [subSubmitting, setSubSubmitting] = useState(false);

  // Conseils officinaux proposés par le pharmacien (facultatifs)
  const [recoChoice,    setRecoChoice]    = useState<Record<string, boolean>>({});
  const [recoSubmitting, setRecoSubmitting] = useState(false);

  const submitRecommendations = async () => {
    if (!order) return;
    const suggested = order.items.filter((i) => i.recommendationStatus === 'suggested');
    const decisions = suggested.map((i) => ({ itemId: i.id, accepted: recoChoice[i.id] === true }));
    setRecoSubmitting(true);
    try {
      await ordersService.decideRecommendation(order.id, decisions);
      await load();
    } catch {
      Alert.alert('Erreur', 'Impossible d\'enregistrer votre choix. Réessayez.');
    } finally {
      setRecoSubmitting(false);
    }
  };

  const submitSubstitution = async () => {
    if (!order) return;
    const pending = order.items.filter((i) => i.substitutionStatus === 'pending');
    const decisions = pending.map((i) => ({ itemId: i.id, accepted: subChoice[i.id] !== false }));
    setSubSubmitting(true);
    try {
      const res = await ordersService.decideSubstitution(order.id, decisions);
      Alert.alert(
        res.cancelled ? 'Commande annulée' : 'Choix enregistré',
        res.cancelled
          ? 'Les équivalents ayant été refusés, la commande est annulée. Contactez votre pharmacien.'
          : 'Merci — votre pharmacien prépare votre commande.',
      );
      await load();
    } catch {
      Alert.alert('Erreur', 'Impossible d\'enregistrer votre choix. Réessayez.');
    } finally {
      setSubSubmitting(false);
    }
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };
  useEffect(() => () => stopPolling(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await ordersService.getById(id);
      setOrder(data);
      if (data.transactionStatus === 'captured') setPayStep('success');
      else if (data.transactionStatus != null)   setPayStep('pending');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const startPolling = () => {
    pollCount.current = 0;
    pollRef.current = setInterval(async () => {
      pollCount.current++;
      try {
        const fresh = await ordersService.getById(id);
        if (fresh.transactionStatus === 'captured') {
          stopPolling();
          setOrder(fresh);
          setPayStep('success');
        } else if (fresh.transactionStatus === 'failed') {
          stopPolling();
          setPayStep('failed');
        }
      } catch { /* on continue */ }
      if (pollCount.current >= MAX_POLL) { stopPolling(); setPayStep('failed'); }
    }, POLL_MS);
  };

  const handlePay = async () => {
    if (!phone.trim()) {
      Alert.alert('Numéro requis', 'Veuillez saisir votre numéro Mobile Money.');
      return;
    }
    if (!order) return;
    setPaying(true);
    try {
      await paymentsService.initEscrow({ orderId: order.id, phoneNumber: phone.trim() });
      setPayStep('pending');
      startPolling();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Paiement impossible. Réessayez.';
      Alert.alert('Erreur', msg);
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} color={colors.primary} />;

  if (error || !order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Impossible de charger la commande.</Text>
        <Pressable onPress={load} style={styles.retryBtn}>
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  const ref         = order.id.slice(-6).toUpperCase();
  const currentRank = ORDER_RANK[order.status] ?? -1;
  const isCancelled = order.status === OrderStatus.CANCELLED || order.status === OrderStatus.PHARMACY_REJECTED;
  const isDispatched = order.status === OrderStatus.DISPATCHED;
  const isDelivered  = order.status === OrderStatus.DELIVERED;
  const isPendingSub = order.status === OrderStatus.PENDING_SUBSTITUTION;
  const pendingSubs  = order.items.filter((i) => i.substitutionStatus === 'pending');
  // Conseils encore en attente du choix patient (modifiables tant que non préparé)
  const suggestedRecos = order.items.filter((i) => i.recommendationStatus === 'suggested');
  const canDecideRecos = order.status === OrderStatus.PENDING_PHARMACY || order.status === OrderStatus.PHARMACY_ACCEPTED;
  // Articles affichés dans le récap : prescrits + conseils acceptés (on masque les
  // conseils encore suggérés — ils vivent dans leur carte — et ceux écartés).
  const billableItems = order.items.filter(
    (i) => i.recommendationStatus !== 'suggested' && i.recommendationStatus !== 'declined',
  );
  const needsPayment = !isCancelled && !isDelivered && !isPendingSub && payStep === 'idle';
  // Tiers-payant : le patient ne règle que sa part (médicaments non couverts +
  // frais). caisseShareFcfa = 0 sans assurance → comportement inchangé.
  const hasInsurance    = order.insuranceProvider !== 'none' && order.caisseShareFcfa > 0;
  const patientMedShare = order.totalFcfa - order.caisseShareFcfa;
  const deliveryFee     = order.deliveryFeeFcfa ?? 0;
  const amountToPay     = patientMedShare + order.serviceFeeFcfa + deliveryFee;
  const insurerLabel    = order.insuranceProvider === 'cnamgs' ? 'CNAMGS' : order.insuranceProvider === 'cnss' ? 'CNSS' : 'Assurance';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Retour</Text>
          </Pressable>
          <Text style={styles.pageTitle}>Commande #{ref}</Text>
          <View style={{ width: 56 }} />
        </View>

        {/* Status + pharmacie */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pharmacie</Text>
            <Text style={styles.infoValue}>{order.pharmacyName ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Statut</Text>
            <StatusBadge status={order.status as OrderStatus} />
          </View>
        </View>

        {/* Timeline */}
        {!isCancelled && (
          <View style={styles.timeline}>
            {STATUS_STEPS.map((step, i) => {
              const stepRank = ORDER_RANK[step.statuses[0]] ?? i;
              const done     = currentRank >= stepRank;
              const active   = currentRank === stepRank;
              const isLast   = i === STATUS_STEPS.length - 1;
              return (
                <View key={i} style={styles.timelineRow}>
                  {/* Colonne gauche : point + ligne */}
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, done && styles.timelineDotDone, active && styles.timelineDotActive]}>
                      <Text style={styles.timelineIcon}>{done ? '✓' : (i + 1).toString()}</Text>
                    </View>
                    {!isLast && <View style={[styles.timelineLine, done && styles.timelineLineDone]} />}
                  </View>
                  {/* Colonne droite : label */}
                  <View style={styles.timelineContent}>
                    <Text style={[
                      styles.timelineLabel,
                      active && styles.timelineLabelActive,
                      done && !active && styles.timelineLabelDone,
                    ]}>
                      {step.icon} {step.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Annulée */}
        {isCancelled && (
          <View style={styles.cancelledBanner}>
            <Text style={styles.cancelledText}>❌ Cette commande a été annulée ou refusée par la pharmacie.</Text>
          </View>
        )}

        {/* Équivalents à valider */}
        {isPendingSub && pendingSubs.length > 0 && (
          <View style={styles.subCard}>
            <Text style={styles.subCardTitle}>🔁 Équivalent(s) proposé(s)</Text>
            <Text style={styles.subCardIntro}>
              Un ou plusieurs médicaments étaient indisponibles. Votre pharmacien propose un
              équivalent. Acceptez ou refusez avant préparation.
            </Text>
            {pendingSubs.map((item) => {
              const accepted = subChoice[item.id] !== false;
              return (
                <View key={item.id} style={styles.subItem}>
                  <Text style={styles.subOrig}>
                    Prescrit : <Text style={styles.subStrike}>{item.originalName ?? '—'}</Text>
                  </Text>
                  <Text style={styles.subProp}>Proposé : {item.name} — {formatFcfa(item.unitPriceFcfa)}</Text>
                  {item.substitutionReason ? (
                    <Text style={styles.subReason}>Motif : {item.substitutionReason}</Text>
                  ) : null}
                  <View style={styles.subBtns}>
                    <Pressable
                      style={[styles.subBtn, accepted && styles.subBtnAccept]}
                      onPress={() => setSubChoice((p) => ({ ...p, [item.id]: true }))}
                    >
                      <Text style={[styles.subBtnTxt, accepted && styles.subBtnTxtOn]}>Accepter</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.subBtn, !accepted && styles.subBtnReject]}
                      onPress={() => setSubChoice((p) => ({ ...p, [item.id]: false }))}
                    >
                      <Text style={[styles.subBtnTxt, !accepted && styles.subBtnTxtOn]}>Refuser</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
            <Pressable
              style={[styles.subConfirm, subSubmitting && { opacity: 0.6 }]}
              disabled={subSubmitting}
              onPress={submitSubstitution}
            >
              <Text style={styles.subConfirmTxt}>
                {subSubmitting ? 'Enregistrement…' : 'Confirmer mon choix'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Le pharmacien recommande (conseils facultatifs) */}
        {suggestedRecos.length > 0 && canDecideRecos && (
          <View style={styles.recoCard}>
            <Text style={styles.recoCardTitle}>💡 Le pharmacien recommande</Text>
            <Text style={styles.recoCardIntro}>
              En complément de votre traitement (facultatif). Cochez ce que vous
              souhaitez ajouter à votre commande — vous restez libre de tout refuser.
            </Text>
            {suggestedRecos.map((item) => {
              const checked = recoChoice[item.id] === true;
              return (
                <Pressable
                  key={item.id}
                  style={styles.recoItem}
                  onPress={() => setRecoChoice((p) => ({ ...p, [item.id]: !checked }))}
                >
                  <View style={[styles.recoCheckbox, checked && styles.recoCheckboxOn]}>
                    {checked && <Text style={styles.recoCheckMark}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recoItemName}>{item.name}</Text>
                    {item.recommendationNote ? (
                      <Text style={styles.recoItemNote}>{item.recommendationNote}</Text>
                    ) : null}
                    <Text style={styles.recoItemPrice}>
                      {item.quantity} × {formatFcfa(item.unitPriceFcfa)} = {formatFcfa(item.totalFcfa)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            <Pressable
              style={[styles.recoConfirm, recoSubmitting && { opacity: 0.6 }]}
              disabled={recoSubmitting}
              onPress={submitRecommendations}
            >
              <Text style={styles.recoConfirmTxt}>
                {recoSubmitting
                  ? 'Enregistrement…'
                  : Object.values(recoChoice).some((v) => v)
                    ? 'Ajouter à ma commande'
                    : 'Ne rien ajouter, continuer'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Médicaments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Médicaments</Text>
          <View style={styles.itemsCard}>
            {billableItems.map((item, i) => (
              <View key={item.id}>
                {i > 0 && <View style={styles.itemDivider} />}
                <View style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>
                      {item.name}
                      {item.kind === 'recommended' ? '  💡' : ''}
                    </Text>
                    <Text style={styles.itemQty}>Qté : {item.quantity} × {formatFcfa(item.unitPriceFcfa)}</Text>
                  </View>
                  <Text style={styles.itemTotal}>{formatFcfa(item.totalFcfa)}</Text>
                </View>
              </View>
            ))}

            <View style={styles.priceDivider} />

            {hasInsurance && (
              <>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Sous-total médicaments</Text>
                  <Text style={styles.priceValue}>{formatFcfa(order.totalFcfa)}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, styles.caisseLabel]}>
                    Pris en charge {insurerLabel} ({order.insuranceCoverageRate}%)
                  </Text>
                  <Text style={[styles.priceValue, styles.caisseValue]}>− {formatFcfa(order.caisseShareFcfa)}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Votre part (médicaments)</Text>
                  <Text style={styles.priceValue}>{formatFcfa(patientMedShare)}</Text>
                </View>
              </>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{fr.order.serviceFee}</Text>
              <Text style={styles.priceValue}>{formatFcfa(order.serviceFeeFcfa)}</Text>
            </View>
            {order.deliveryFeeFcfa != null && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{fr.order.deliveryFee}</Text>
                <Text style={styles.priceValue}>{formatFcfa(order.deliveryFeeFcfa)}</Text>
              </View>
            )}
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>{hasInsurance ? 'À votre charge' : fr.order.grandTotal}</Text>
              <Text style={styles.totalValue}>{formatFcfa(amountToPay)}</Text>
            </View>
            {hasInsurance && (
              <Text style={styles.caisseNote}>
                💳 {formatFcfa(order.caisseShareFcfa)} facturés au tiers-payant {insurerLabel} — vous ne réglez que votre part.
              </Text>
            )}
          </View>
        </View>

        {/* Paiement */}
        {needsPayment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💳 Paiement Mobile Money</Text>
            <View style={styles.payCard}>
              <Text style={styles.payHint}>
                Réglez {formatFcfa(amountToPay)} par Mobile Money pour confirmer votre commande.
              </Text>
              <Text style={styles.inputLabel}>Numéro Mobile Money</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+241 07 XX XX XX"
                placeholderTextColor={colors.textDisabled}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
              <Pressable
                style={[styles.payBtn, paying && styles.payBtnDisabled]}
                onPress={handlePay}
                disabled={paying}
              >
                <Text style={styles.payBtnText}>
                  {paying ? 'Traitement…' : `Payer ${formatFcfa(amountToPay)}`}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {payStep === 'pending' && (
          <View style={styles.payPendingBox}>
            <ActivityIndicator color={colors.warning} />
            <Text style={styles.payPendingText}>Paiement en cours de traitement…{'\n'}Veuillez valider sur votre téléphone.</Text>
          </View>
        )}

        {payStep === 'success' && (
          <View style={styles.paySuccessBox}>
            <Text style={styles.paySuccessIcon}>✅</Text>
            <Text style={styles.paySuccessText}>Paiement confirmé</Text>
          </View>
        )}

        {payStep === 'failed' && (
          <View style={styles.payFailedBox}>
            <Text style={styles.payFailedText}>❌ Paiement échoué. Réessayez plus tard.</Text>
            <Pressable onPress={() => setPayStep('idle')} style={styles.retryBtn}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {/* Code de remise : le patient le MONTRE au livreur, qui le saisit pour
            confirmer la livraison et libérer le paiement. */}
        {isDispatched && order.handoverCode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 {fr.order.handover}</Text>
            <View style={styles.handoverCard}>
              <Text style={styles.handoverHint}>
                À la réception, montrez ce code au livreur. C'est lui qui le saisit
                pour confirmer la livraison — ne le partagez qu'en main propre.
              </Text>
              <View style={styles.codeDisplay}>
                <Text style={styles.codeDisplayTxt}>{order.handoverCode}</Text>
              </View>
              <Text style={styles.codeCaption}>Votre code de remise</Text>
            </View>
          </View>
        )}

        {/* Livraison terminée */}
        {isDelivered && (
          <View style={styles.deliveredBox}>
            <Text style={styles.deliveredIcon}>🎉</Text>
            <Text style={styles.deliveredTitle}>Commande livrée !</Text>
            <Text style={styles.deliveredSub}>Merci d'avoir utilisé MBOLO Santé.</Text>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
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
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  infoValue: { ...typography.bodyMedium, color: colors.text, flex: 2, textAlign: 'right' },

  // Timeline
  timeline: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, ...shadows.card },
  timelineRow:     { flexDirection: 'row', minHeight: 40 },
  timelineLeft:    { width: 28, alignItems: 'center' },
  timelineContent: { flex: 1, paddingLeft: spacing.sm, paddingBottom: spacing.sm, justifyContent: 'center' },
  timelineDot: {
    width: 24, height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineDotDone:   { backgroundColor: colors.success },
  timelineDotActive: { backgroundColor: colors.primary },
  timelineIcon:      { fontSize: 10, color: colors.surface, fontWeight: '700' },
  timelineLine:      { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 },
  timelineLineDone:  { backgroundColor: colors.success },
  timelineLabel:     { ...typography.caption, color: colors.textDisabled },
  timelineLabelActive: { ...typography.label, color: colors.primary },
  timelineLabelDone:   { ...typography.caption, color: colors.textSecondary },

  cancelledBanner: {
    backgroundColor: colors.errorSurface,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  cancelledText: { ...typography.body, color: colors.error },

  subCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.accent,
    ...shadows.card,
  },
  subCardTitle: { ...typography.bodyMedium, color: colors.text },
  subCardIntro: { ...typography.caption, color: colors.textSecondary },
  subItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: 2,
  },
  subOrig:   { ...typography.caption, color: colors.textSecondary },
  subStrike: { textDecorationLine: 'line-through' },
  subProp:   { ...typography.bodyMedium, color: colors.text },
  subReason: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic' },
  subBtns:   { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  subBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  subBtnAccept: { backgroundColor: colors.success, borderColor: colors.success },
  subBtnReject: { backgroundColor: colors.error, borderColor: colors.error },
  subBtnTxt:    { ...typography.label, color: colors.textSecondary },
  subBtnTxtOn:  { color: colors.textOnDark },
  subConfirm: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  subConfirmTxt: { ...typography.bodyMedium, color: colors.textOnDark },

  // Conseil officinal (cross-sell)
  recoCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.accent,
    ...shadows.card,
  },
  recoCardTitle: { ...typography.bodyMedium, color: colors.text },
  recoCardIntro: { ...typography.caption, color: colors.textSecondary },
  recoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  recoCheckbox: {
    width: 22, height: 22, borderRadius: radii.sm, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  recoCheckboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  recoCheckMark:  { ...typography.label, color: colors.textOnDark },
  recoItemName:  { ...typography.bodyMedium, color: colors.text },
  recoItemNote:  { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic' },
  recoItemPrice: { ...typography.caption, color: colors.text, marginTop: 2 },
  recoConfirm: {
    marginTop: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  recoConfirmTxt: { ...typography.bodyMedium, color: colors.textOnDark },

  section:      { gap: spacing.sm },
  sectionTitle: { ...typography.bodyMedium, color: colors.text },

  itemsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  itemRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemDivider:  { height: 1, backgroundColor: colors.border },
  itemName:     { ...typography.bodyMedium, color: colors.text },
  itemQty:      { ...typography.caption, color: colors.textSecondary },
  itemTotal:    { ...typography.bodyMedium, color: colors.text },

  priceDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  priceRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel:   { ...typography.caption, color: colors.textSecondary },
  priceValue:   { ...typography.caption, color: colors.text },
  totalRow:     { marginTop: spacing.xs },
  totalLabel:   { ...typography.bodyMedium, color: colors.text },
  totalValue:   { ...typography.bodyMedium, color: colors.primary },
  caisseLabel:  { color: colors.success, flex: 1 },
  caisseValue:  { color: colors.success },
  caisseNote:   { ...typography.small, color: colors.textSecondary, marginTop: spacing.xs },

  // Paiement
  payCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  payHint:    { ...typography.body, color: colors.textSecondary },
  inputLabel: { ...typography.label, color: colors.text },
  input: {
    ...typography.body,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  payBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  payBtnDisabled: { opacity: 0.5 },
  payBtnText:     { ...typography.bodyMedium, color: colors.textOnDark },

  payPendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warningSurface,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  payPendingText: { ...typography.body, color: colors.warning, flex: 1 },

  paySuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSurface,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  paySuccessIcon: { fontSize: 20 },
  paySuccessText: { ...typography.bodyMedium, color: colors.success },

  payFailedBox: {
    backgroundColor: colors.errorSurface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  payFailedText: { ...typography.body, color: colors.error },

  // Handover
  handoverCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  handoverHint: { ...typography.body, color: colors.textSecondary },
  codeDisplay: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
  },
  codeDisplayTxt: { ...typography.h1, color: colors.primary, letterSpacing: 10 },
  codeCaption:    { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  codeInput: {
    ...typography.h2,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    letterSpacing: 8,
  },
  handoverBtn: {
    backgroundColor: colors.info,
    borderRadius: radii.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  handoverBtnText: { ...typography.bodyMedium, color: colors.textOnDark },

  // Livraison terminée
  deliveredBox: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSurface,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  deliveredIcon:  { fontSize: 48 },
  deliveredTitle: { ...typography.h3, color: colors.success },
  deliveredSub:   { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

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
