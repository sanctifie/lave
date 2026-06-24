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
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { paymentsService } from '../../../src/services/payments.service';
import { useAuthStore } from '../../../src/stores/auth.store';
import { colors, spacing, radii, shadows, typography } from '../../../src/theme';

type Operator = 'orange' | 'airtel';
type Step = 'form' | 'pending' | 'success' | 'failed';

const OPERATORS: { key: Operator; label: string; color: string; prefix: string }[] = [
  { key: 'orange', label: 'Orange Money', color: '#FF6600', prefix: '241 06' },
  { key: 'airtel', label: 'Airtel Money',  color: '#E30613', prefix: '241 07' },
];

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS        = 20; // 1 min max

export default function PayScreen() {
  const { consultationId, amount } = useLocalSearchParams<{ consultationId: string; amount: string }>();
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);

  const [step,         setStep]         = useState<Step>('form');
  const [operator,     setOperator]     = useState<Operator>('orange');
  const [phoneNumber,  setPhoneNumber]  = useState(user?.phone ?? '');
  const [submitting,   setSubmitting]   = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const pollCount = useRef(0);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const amountFcfa = parseInt(amount ?? '0', 10);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  const startPolling = () => {
    pollCount.current = 0;
    pollRef.current = setInterval(async () => {
      pollCount.current++;
      try {
        const status = await paymentsService.getConsultationStatus(consultationId);
        const txStatus = status.transaction?.status;
        if (txStatus === 'captured') {
          stopPolling();
          setStep('success');
        } else if (txStatus === 'failed') {
          stopPolling();
          setStep('failed');
        }
      } catch { /* on continue */ }

      if (pollCount.current >= MAX_POLLS) {
        stopPolling();
        setStep('failed');
      }
    }, POLL_INTERVAL_MS);
  };

  const handleSubmit = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Numéro requis', 'Veuillez saisir votre numéro de téléphone.');
      return;
    }
    setSubmitting(true);
    try {
      const txn = await paymentsService.initConsultationPayment({
        consultationId,
        phoneNumber: phoneNumber.trim(),
        operator,
      });
      setTransactionId(txn.id);
      setStep('pending');
      startPolling();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? e.message ?? 'Paiement impossible');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Écran de succès ─────────────────────────────────────────────────────────

  if (step === 'success') {
    return (
      <View style={styles.resultContainer}>
        <View style={styles.iconCircle}>
          <Text style={styles.resultIcon}>✓</Text>
        </View>
        <Text style={styles.resultTitle}>Paiement confirmé !</Text>
        <Text style={styles.resultSub}>
          {amountFcfa.toLocaleString('fr-FR')} FCFA reçus.{'\n'}
          Votre médecin a été rémunéré.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace('/(patient)/appointments')}>
          <Text style={styles.primaryBtnText}>Retour aux RDV</Text>
        </Pressable>
      </View>
    );
  }

  // ─── Écran d'échec ────────────────────────────────────────────────────────────

  if (step === 'failed') {
    return (
      <View style={styles.resultContainer}>
        <View style={[styles.iconCircle, { backgroundColor: colors.errorSurface }]}>
          <Text style={[styles.resultIcon, { color: colors.error }]}>✕</Text>
        </View>
        <Text style={[styles.resultTitle, { color: colors.error }]}>Paiement échoué</Text>
        <Text style={styles.resultSub}>
          Vérifiez votre solde ou réessayez avec un autre opérateur.
        </Text>
        <Pressable style={[styles.primaryBtn, { backgroundColor: colors.error }]} onPress={() => setStep('form')}>
          <Text style={styles.primaryBtnText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  // ─── Écran en attente ─────────────────────────────────────────────────────────

  if (step === 'pending') {
    return (
      <View style={styles.resultContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.resultTitle, { marginTop: spacing[6] }]}>En attente de confirmation</Text>
        <Text style={styles.resultSub}>
          Acceptez le paiement sur votre téléphone{'\n'}({phoneNumber})
        </Text>
        <Text style={styles.pendingHint}>
          Ne quittez pas cet écran.
        </Text>
      </View>
    );
  }

  // ─── Formulaire ───────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Montant */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Montant à payer</Text>
          <Text style={styles.amountValue}>{amountFcfa.toLocaleString('fr-FR')} FCFA</Text>
          <Text style={styles.amountSub}>Consultation médicale</Text>
        </View>

        {/* Choix opérateur */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opérateur</Text>
          <View style={styles.operatorRow}>
            {OPERATORS.map((op) => (
              <Pressable
                key={op.key}
                style={[styles.operatorCard, operator === op.key && { borderColor: op.color, borderWidth: 2 }]}
                onPress={() => setOperator(op.key)}
              >
                <View style={[styles.operatorDot, { backgroundColor: op.color }]} />
                <Text style={[styles.operatorLabel, operator === op.key && { color: op.color }]}>
                  {op.label}
                </Text>
                {operator === op.key && <Text style={[styles.checkmark, { color: op.color }]}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Numéro de téléphone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Numéro de téléphone</Text>
          <Text style={styles.sectionHint}>
            {OPERATORS.find((o) => o.key === operator)?.label} — commence par {OPERATORS.find((o) => o.key === operator)?.prefix}
          </Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="241 06 XX XX XX"
            keyboardType="phone-pad"
            placeholderTextColor={colors.textDisabled}
          />
        </View>

        {/* Bouton payer */}
        <Pressable
          style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color={colors.textOnDark} />
            : <Text style={styles.primaryBtnText}>
                Payer {amountFcfa.toLocaleString('fr-FR')} FCFA
              </Text>
          }
        </Pressable>

        <Text style={styles.secureNote}>🔒 Paiement sécurisé via MeSomb</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing[4], gap: spacing[4] },

  amountCard: {
    backgroundColor: colors.primary,
    borderRadius:    radii.xl,
    padding:         spacing[6],
    alignItems:      'center',
    ...shadows.modal,
  },
  amountLabel: { ...typography.caption, color: 'rgba(255,255,255,0.8)' },
  amountValue: { fontSize: 36, fontWeight: '800', color: colors.textOnDark, marginVertical: spacing[1] },
  amountSub:   { ...typography.caption, color: 'rgba(255,255,255,0.7)' },

  section:      { gap: spacing[2] },
  sectionTitle: { ...typography.h3, color: colors.text },
  sectionHint:  { ...typography.caption, color: colors.textSecondary },

  operatorRow: { flexDirection: 'row', gap: spacing[3] },
  operatorCard: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing[2],
    backgroundColor: colors.surface,
    borderRadius:    radii.lg,
    padding:         spacing[3],
    borderWidth:     1.5,
    borderColor:     colors.border,
    ...shadows.card,
  },
  operatorDot:   { width: 12, height: 12, borderRadius: 6 },
  operatorLabel: { ...typography.body2, color: colors.text, flex: 1 },
  checkmark:     { fontWeight: '700' },

  input: {
    backgroundColor: colors.surface,
    borderWidth:     1.5,
    borderColor:     colors.border,
    borderRadius:    radii.lg,
    padding:         spacing[4],
    ...typography.body1,
    color:           colors.text,
  },

  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius:    radii.full,
    padding:         spacing[4],
    alignItems:      'center',
    ...shadows.card,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { ...typography.body1, color: colors.textOnDark, fontWeight: '700' },

  secureNote: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },

  // Résultat (succès/échec/attente)
  resultContainer: {
    flex:            1,
    backgroundColor: colors.background,
    justifyContent:  'center',
    alignItems:      'center',
    padding:         spacing[8],
    gap:             spacing[4],
  },
  iconCircle: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: colors.successSurface,
    justifyContent:  'center',
    alignItems:      'center',
  },
  resultIcon:  { fontSize: 36, color: colors.success },
  resultTitle: { ...typography.h2, color: colors.text, textAlign: 'center' },
  resultSub:   { ...typography.body2, color: colors.textSecondary, textAlign: 'center' },
  pendingHint: { ...typography.caption, color: colors.primary, textAlign: 'center', marginTop: spacing[2] },
});
