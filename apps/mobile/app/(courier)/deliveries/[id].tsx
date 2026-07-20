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
import { DeliveryStatus } from '@mbolo/shared';
import { deliveriesService, DeliveryItem } from '../../../src/services/deliveries.service';
import { Button } from '../../../src/components/ui/Button';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

const HANDOVER_LENGTH = 6;

type StepStatus = 'done' | 'active' | 'pending';

function Step({ label, status }: { label: string; status: StepStatus }) {
  return (
    <View style={stepStyles.row}>
      <View style={[stepStyles.dot, status === 'done' && stepStyles.dotDone, status === 'active' && stepStyles.dotActive]} >
        {status === 'done' && <Text style={stepStyles.check}>✓</Text>}
      </View>
      <View style={stepStyles.line} />
      <Text style={[stepStyles.label, status === 'active' && stepStyles.labelActive]}>{label}</Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot:        { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  dotDone:    { borderColor: colors.success, backgroundColor: colors.success },
  dotActive:  { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  check:      { color: colors.textOnDark, fontSize: 12, fontWeight: '700' },
  line:       { width: 1 },
  label:      { ...typography.caption, color: colors.textSecondary, flex: 1 },
  labelActive:{ ...typography.bodyMedium, color: colors.primary },
});

const STEPS: { status: DeliveryStatus; label: string }[] = [
  { status: DeliveryStatus.ASSIGNED,           label: 'Mission acceptée'           },
  { status: DeliveryStatus.EN_ROUTE_PICKUP,    label: 'En route vers la pharmacie' },
  { status: DeliveryStatus.PICKED_UP,          label: 'Colis récupéré'             },
  { status: DeliveryStatus.EN_ROUTE_DELIVERY,  label: 'En route vers le patient'   },
  { status: DeliveryStatus.DELIVERED,          label: 'Livré — escrow libéré'      },
];

function getStepIndex(status: string): number {
  return STEPS.findIndex((s) => s.status === status);
}

export default function DeliveryDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const codeRef = useRef<TextInput>(null);

  const [delivery, setDelivery]       = useState<DeliveryItem | null>(null);
  const [loading, setLoading]         = useState(true);
  const [advancing, setAdvancing]     = useState(false);
  const [code, setCode]               = useState('');
  const [submittingHandover, setSubmittingHandover] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await deliveriesService.getById(id);
      setDelivery(data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger la livraison.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async () => {
    setAdvancing(true);
    try {
      await deliveriesService.accept(id);
      await load();
    } catch {
      Alert.alert('Erreur', 'Impossible d\'accepter cette livraison.');
    } finally {
      setAdvancing(false);
    }
  };

  const handleAdvance = async (nextStatus: string) => {
    setAdvancing(true);
    try {
      await deliveriesService.updateStatus(id, nextStatus);
      await load();
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut.');
    } finally {
      setAdvancing(false);
    }
  };

  const handleHandover = async () => {
    if (code.length !== HANDOVER_LENGTH) return;
    setSubmittingHandover(true);
    try {
      await deliveriesService.confirmHandover(id, code);
      Alert.alert('Livraison confirmée !', 'Le paiement a été libéré à la pharmacie.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Code invalide', 'Le code de remise est incorrect. Demandez-le au patient.');
      setCode('');
    } finally {
      setSubmittingHandover(false);
    }
  };

  const formatFcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

  if (loading) return <ActivityIndicator style={styles.center} color={colors.primary} />;
  if (!delivery) return null;

  const currentIdx    = getStepIndex(delivery.status);
  const isPending     = delivery.status === DeliveryStatus.PENDING_ASSIGNMENT;
  const isActive      = delivery.status !== DeliveryStatus.DELIVERED && delivery.status !== DeliveryStatus.FAILED && !isPending;
  const needsHandover = delivery.status === DeliveryStatus.EN_ROUTE_DELIVERY;

  const NEXT_STATUS: Record<string, string> = {
    [DeliveryStatus.ASSIGNED]:          DeliveryStatus.EN_ROUTE_PICKUP,
    [DeliveryStatus.EN_ROUTE_PICKUP]:   DeliveryStatus.PICKED_UP,
    [DeliveryStatus.PICKED_UP]:         DeliveryStatus.EN_ROUTE_DELIVERY,
  };
  const NEXT_LABEL: Record<string, string> = {
    [DeliveryStatus.ASSIGNED]:          'En route vers la pharmacie →',
    [DeliveryStatus.EN_ROUTE_PICKUP]:   'Colis récupéré →',
    [DeliveryStatus.PICKED_UP]:         'En route vers le patient →',
  };
  const nextStatus = NEXT_STATUS[delivery.status];
  const nextLabel  = NEXT_LABEL[delivery.status];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable>
          <Text style={styles.pageTitle}>Livraison</Text>
          <StatusBadge status={delivery.status as DeliveryStatus} />
        </View>

        {/* Route card */}
        <View style={styles.routeCard}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: colors.accent }]} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>Pharmacie</Text>
              <Text style={styles.routeName}>{delivery.pharmacyName}</Text>
              <Text style={styles.routeAddr}>{delivery.pharmacyAddress}</Text>
            </View>
          </View>
          <View style={styles.routeConnector} />
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>Patient</Text>
              <Text style={styles.routeName}>{delivery.patientName}</Text>
              <Text style={styles.routeAddr}>{delivery.patientAddress}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Valeur de la commande</Text>
            <Text style={styles.totalValue}>{formatFcfa(delivery.totalFcfa)}</Text>
          </View>
        </View>

        {/* Progress steps */}
        <Text style={styles.sectionTitle}>Progression</Text>
        <View style={styles.stepsCard}>
          {STEPS.map((step, idx) => {
            const status: StepStatus =
              idx < currentIdx  ? 'done'    :
              idx === currentIdx ? 'active' : 'pending';
            return <Step key={step.status} label={step.label} status={status} />;
          })}
        </View>

        {/* Accepter la livraison */}
        {isPending && (
          <Button
            label={advancing ? 'Acceptation…' : 'Accepter cette livraison'}
            onPress={handleAccept}
            loading={advancing}
            disabled={advancing}
          />
        )}

        {/* Avancer l'étape en cours */}
        {isActive && nextStatus && (
          <Button
            label={advancing ? 'Mise à jour…' : nextLabel}
            onPress={() => handleAdvance(nextStatus)}
            loading={advancing}
            disabled={advancing}
          />
        )}

        {/* Stupéfiant — étape 1 : récupérer l'original CHEZ LE PATIENT d'abord */}
        {delivery?.paperStatus === 'to_collect' && (
          <View style={styles.paperCard}>
            <Text style={styles.paperTitle}>⚖️ Original requis — étape 1</Text>
            <Text style={styles.paperHint}>
              Passez D'ABORD chez le patient récupérer l'ordonnance papier ORIGINALE,
              puis apportez-la à la pharmacie : c'est un employé de l'officine qui y
              appose le cachet (et le n° d'ordonnancier si stupéfiant). Vous n'écrivez rien.
            </Text>
            <Pressable
              style={styles.paperBtn}
              onPress={async () => {
                try {
                  if (delivery.orderId) await deliveriesService.paperCollected(delivery.orderId);
                  await load();
                } catch { Alert.alert('Erreur', 'Impossible de confirmer. Réessayez.'); }
              }}
            >
              <Text style={styles.paperBtnTxt}>✓ Original récupéré chez le patient</Text>
            </Pressable>
          </View>
        )}

        {/* Stupéfiant — attente : original chez le pharmacien pour annotation */}
        {delivery?.paperStatus === 'collected' && (
          <View style={styles.paperCard}>
            <Text style={styles.paperTitle}>⚖️ Original déposé à l'officine</Text>
            <Text style={styles.paperHint}>
              Déposez l'original à la pharmacie. Un employé y appose le cachet (et le
              n° d'ordonnancier si stupéfiant) et scelle le colis — la remise se débloque ensuite.
            </Text>
          </View>
        )}

        {/* Paiement à la livraison : espèces à encaisser avant de confirmer */}
        {needsHandover && delivery?.paymentMethod === 'cod' && (
          <View style={styles.codCard}>
            <Text style={styles.codTitle}>💵 Paiement à la livraison</Text>
            <Text style={styles.codAmount}>{formatFcfa(delivery.codDueFcfa)}</Text>
            <Text style={styles.codHint}>Encaissez ce montant EN ESPÈCES avant de saisir le code de remise.</Text>
          </View>
        )}

        {/* Handover code — verrouillé tant qu'un original stupéfiant n'est pas vérifié */}
        {needsHandover && delivery?.paperStatus !== 'to_collect' && delivery?.paperStatus !== 'collected' && (
          <View style={styles.handoverCard}>
            <Text style={styles.handoverTitle}>Code de remise</Text>
            <Text style={styles.handoverHint}>
              Demandez le code à 6 chiffres au patient pour confirmer la livraison et libérer le paiement.
            </Text>

            {/* OTP-style boxes */}
            <Pressable style={styles.digitsRow} onPress={() => codeRef.current?.focus()}>
              {Array.from({ length: HANDOVER_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.digitBox, code[i] ? styles.digitBoxFilled : undefined]}
                >
                  <Text style={styles.digitText}>{code[i] ?? ''}</Text>
                </View>
              ))}
            </Pressable>

            <TextInput
              ref={codeRef}
              value={code}
              onChangeText={(v) => {
                const clean = v.replace(/\D/g, '').slice(0, HANDOVER_LENGTH);
                setCode(clean);
              }}
              keyboardType="number-pad"
              maxLength={HANDOVER_LENGTH}
              style={styles.hiddenInput}
              autoFocus={false}
            />

            <Button
              label={submittingHandover ? 'Confirmation…' : 'Confirmer la remise'}
              onPress={handleHandover}
              loading={submittingHandover}
              disabled={code.length !== HANDOVER_LENGTH || submittingHandover}
            />
          </View>
        )}

        {!isActive && delivery.status === DeliveryStatus.DELIVERED && (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>🎉</Text>
            <Text style={styles.successText}>Livraison terminée ! Paiement libéré.</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
  },
  back:      { ...typography.bodyMedium, color: colors.primary },
  pageTitle: { ...typography.h3, color: colors.text },

  routeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  routePoint: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  routeDot:   { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  routeInfo:  { flex: 1, gap: 2 },
  routeLabel: { ...typography.small, color: colors.textSecondary },
  routeName:  { ...typography.bodyMedium, color: colors.text },
  routeAddr:  { ...typography.caption, color: colors.textSecondary },
  routeConnector: { width: 1, height: 16, backgroundColor: colors.border, marginLeft: 6 },

  divider:    { height: 1, backgroundColor: colors.border },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { ...typography.caption, color: colors.textSecondary },
  totalValue: { ...typography.bodyMedium, color: colors.primary },

  sectionTitle: { ...typography.h3, color: colors.text },

  stepsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },

  codCard: { backgroundColor: colors.successSurface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs, borderWidth: 1.5, borderColor: colors.success, alignItems: 'center' },
  codTitle: { ...typography.label, color: colors.success },
  codAmount: { ...typography.h2, color: colors.success },
  codHint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  paperCard: {
    backgroundColor: colors.warningSurface, borderRadius: radii.lg, padding: spacing.md,
    gap: spacing.sm, borderWidth: 1.5, borderColor: colors.warning,
  },
  paperTitle: { ...typography.bodyMedium, color: colors.warning },
  paperHint:  { ...typography.caption, color: colors.textSecondary },
  paperBtn:   { backgroundColor: colors.warning, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: 'center' },
  paperBtnTxt:{ ...typography.label, color: colors.textOnDark },

  handoverCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  handoverTitle: { ...typography.bodyMedium, color: colors.text },
  handoverHint:  { ...typography.caption, color: colors.textSecondary },

  digitsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  digitBox: {
    width: 44, height: 52,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  digitBoxFilled: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  digitText:      { ...typography.h3, color: colors.text },
  hiddenInput:    { position: 'absolute', opacity: 0, height: 0 },

  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSurface,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  successIcon: { fontSize: 28 },
  successText: { ...typography.bodyMedium, color: colors.success, flex: 1 },
});
