import React, { useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { paymentsService } from '../../../src/services/payments.service';
import { useAuthStore } from '../../../src/store/auth.store';
import { colors, spacing, radii, shadows, typography } from '../../../src/theme';

type Operator = 'airtel' | 'moov';
type Step = 'form' | 'pending' | 'success' | 'failed';

const OPERATORS: { key: Operator; label: string; color: string; prefix: string }[] = [
  { key: 'airtel', label: 'Airtel Money', color: '#E30613', prefix: '241 07' },
  { key: 'moov',   label: 'Moov Money',  color: '#0070C0', prefix: '241 04' },
];

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS        = 20;

export default function RidePayScreen() {
  const { rideId, amount } = useLocalSearchParams<{ rideId: string; amount: string }>();
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);

  const [step,        setStep]        = useState<Step>('form');
  const [operator,    setOperator]    = useState<Operator>('airtel');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone ?? '');
  const [submitting,  setSubmitting]  = useState(false);

  const pollCount = useRef(0);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const amountFcfa = parseInt(amount ?? '0', 10);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };
  useEffect(() => () => stopPolling(), []);

  const startPolling = () => {
    pollCount.current = 0;
    pollRef.current = setInterval(async () => {
      pollCount.current++;
      try {
        const status = await paymentsService.getRidePaymentStatus(rideId);
        const txStatus = status.transaction?.status;
        if (txStatus === 'captured') { stopPolling(); setStep('success'); }
        else if (txStatus === 'failed') { stopPolling(); setStep('failed'); }
      } catch { /* on continue */ }
      if (pollCount.current >= MAX_POLLS) { stopPolling(); setStep('failed'); }
    }, POLL_INTERVAL_MS);
  };

  const handleSubmit = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Numéro requis', 'Veuillez saisir votre numéro de téléphone.');
      return;
    }
    setSubmitting(true);
    try {
      await paymentsService.initRidePayment({ rideId, phoneNumber: phoneNumber.trim(), operator });
      setStep('pending');
      startPolling();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? e.message ?? 'Paiement impossible');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <ScrollView contentContainerStyle={styles.resultContainer}>
        <Text style={styles.resultIcon}>✓</Text>
        <Text style={styles.resultTitle}>Paiement confirmé !</Text>
        <Text style={styles.resultSub}>
          {amountFcfa.toLocaleString('fr-FR')} FCFA mis en escrow.{'\n'}
          Le chauffeur sera payé à la fin de la course.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace(`/(patient)/rides/${rideId}` as any)}>
          <Text style={styles.primaryBtnText}>Suivre ma course</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (step === 'failed') {
    return (
      <ScrollView contentContainerStyle={styles.resultContainer}>
        <Text style={[styles.resultIcon, { color: colors.error }]}>✕</Text>
        <Text style={[styles.resultTitle, { color: colors.error }]}>Paiement échoué</Text>
        <Text style={styles.resultSub}>Vérifiez votre solde ou réessayez.</Text>
        <Pressable style={[styles.primaryBtn, { backgroundColor: colors.error }]} onPress={() => setStep('form')}>
          <Text style={styles.primaryBtnText}>Réessayer</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (step === 'pending') {
    return (
      <ScrollView contentContainerStyle={styles.resultContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.resultTitle, { marginTop: spacing.lg }]}>En attente de confirmation</Text>
        <Text style={styles.resultSub}>
          Acceptez le paiement sur votre téléphone{'\n'}({phoneNumber})
        </Text>
        <Text style={styles.pendingHint}>Ne quittez pas cet écran.</Text>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.backText} onPress={() => router.back()}>‹ Retour</Text>

        <Text style={styles.pageTitle}>Payer la course</Text>

        {/* Montant */}
        <Text style={styles.amountValue}>{amountFcfa.toLocaleString('fr-FR')} FCFA</Text>
        <Text style={styles.amountSub}>Transport médical — mis en escrow, libéré à la fin de la course</Text>

        {/* Opérateur */}
        <Text style={styles.sectionTitle}>Opérateur</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.md }}>
          {OPERATORS.map((op) => (
            <Pressable
              key={op.key}
              style={[styles.operatorCard, operator === op.key && { borderColor: op.color, borderWidth: 2 }]}
              onPress={() => setOperator(op.key)}
            >
              <Text style={[styles.operatorLabel, operator === op.key && { color: op.color }]}>{op.label}</Text>
              {operator === op.key && <Text style={{ color: op.color }}>✓</Text>}
            </Pressable>
          ))}
        </ScrollView>

        {/* Numéro */}
        <Text style={styles.sectionTitle}>Numéro de téléphone</Text>
        <Text style={styles.sectionHint}>
          Commence par {OPERATORS.find((o) => o.key === operator)?.prefix}
        </Text>
        <TextInput
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="241 07 XX XX XX"
          keyboardType="phone-pad"
          placeholderTextColor={colors.textDisabled}
        />

        <Pressable
          style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color={colors.textOnDark} />
            : <Text style={styles.primaryBtnText}>Payer {amountFcfa.toLocaleString('fr-FR')} FCFA</Text>
          }
        </Pressable>

        <Text style={styles.secureNote}>🔒 Paiement sécurisé — libéré après la course</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },

  backText:  { ...typography.body, color: colors.primary },
  pageTitle: { ...typography.h2, color: colors.text },

  amountValue: { fontSize: 40, fontWeight: '800', color: colors.primary },
  amountSub:   { ...typography.caption, color: colors.textSecondary },

  sectionTitle: { ...typography.bodyMedium, color: colors.text },
  sectionHint:  { ...typography.caption, color: colors.textSecondary, marginTop: -spacing.xs },

  operatorCard: {
    marginLeft:      spacing.md,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.xs,
    backgroundColor: colors.surface,
    borderRadius:    radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth:     1.5,
    borderColor:     colors.border,
    ...shadows.card,
  },
  operatorLabel: { ...typography.body, color: colors.text },

  input: {
    backgroundColor: colors.surface,
    borderWidth:     1.5,
    borderColor:     colors.border,
    borderRadius:    radii.lg,
    padding:         spacing.md,
    ...typography.bodyMedium,
    color:           colors.text,
  },

  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius:    radii.full,
    padding:         spacing.md,
    alignItems:      'center',
    ...shadows.card,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { ...typography.bodyMedium, color: colors.textOnDark },
  secureNote: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },

  resultContainer: {
    flex:           1,
    minHeight:      500,
    justifyContent: 'center',
    alignItems:     'center',
    padding:        spacing.xl,
    gap:            spacing.md,
  },
  resultIcon:  { fontSize: 52, color: colors.success },
  resultTitle: { ...typography.h2, color: colors.text, textAlign: 'center' },
  resultSub:   { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  pendingHint: { ...typography.caption, color: colors.primary, textAlign: 'center' },
});
