import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { pharmacyService, InboxPrescription, ValidationItem } from '../../../src/services/pharmacy.service';
import { Button } from '../../../src/components/ui/Button';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { PrescriptionStatus } from '@mbolo/shared';
import { API_URL } from '../../../src/services/client';
import { useAuthStore } from '../../../src/store/auth.store';

interface ItemForm extends ValidationItem {
  _key: string;
}

function newItem(): ItemForm {
  return { _key: Math.random().toString(36).slice(2), name: '', quantity: 1, unitPriceFcfa: 0 };
}

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }

export default function PrescriptionValidateScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const [rx, setRx]           = useState<InboxPrescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems]     = useState<ItemForm[]>([newItem()]);
  const [rejectReason, setRejectReason] = useState('');
  const [mode, setMode]       = useState<'validate' | 'reject'>('validate');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await pharmacyService.getById(id);
      setRx(data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger l\'ordonnance.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const updateItem = (key: string, field: keyof ValidationItem, raw: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it._key !== key) return it;
        if (field === 'name')               return { ...it, name: raw };
        if (field === 'quantity')           return { ...it, quantity: parseInt(raw) || 0 };
        if (field === 'unitPriceFcfa')      return { ...it, unitPriceFcfa: parseInt(raw) || 0 };
        if (field === 'originalName')       return { ...it, originalName: raw };
        if (field === 'substitutionReason') return { ...it, substitutionReason: raw };
        return it;
      })
    );
  };

  const toggleSubstituted = (key: string) => {
    setItems((prev) =>
      prev.map((it) => (it._key === key ? { ...it, substituted: !it.substituted } : it)),
    );
  };

  const addItem   = () => setItems((prev) => [...prev, newItem()]);
  const removeItem = (key: string) => setItems((prev) => prev.filter((i) => i._key !== key));

  const totalFcfa = items.reduce((s, i) => s + i.quantity * i.unitPriceFcfa, 0);

  const submit = async () => {
    if (mode === 'validate') {
      const invalid = items.some((i) => !i.name.trim() || i.quantity <= 0 || i.unitPriceFcfa <= 0);
      if (invalid) { Alert.alert('', 'Remplissez tous les médicaments (nom, quantité, prix).'); return; }
      setSubmitting(true);
      try {
        await pharmacyService.validate(id, items.map(({ _key: _k, ...rest }) => rest));
        Alert.alert('Validée !', 'L\'ordonnance a été validée et la commande créée.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch {
        Alert.alert('Erreur', 'Impossible de valider. Réessayez.');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!rejectReason.trim()) { Alert.alert('', 'Indiquez le motif de refus.'); return; }
      setSubmitting(true);
      try {
        await pharmacyService.reject(id, rejectReason.trim());
        Alert.alert('Refusée', 'L\'ordonnance a été refusée.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch {
        Alert.alert('Erreur', 'Impossible de refuser. Réessayez.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const isAlreadyHandled = rx && rx.status !== PrescriptionStatus.PENDING_VALIDATION;

  if (loading) {
    return <ActivityIndicator style={styles.center} color={colors.primary} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable>
          <Text style={styles.pageTitle}>Validation</Text>
          <View style={{ width: 56 }} />
        </View>

        {/* Patient info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Patient</Text>
            <Text style={styles.infoValue}>{rx?.patientName}</Text>
          </View>
          {rx?.notes && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Notes</Text>
              <Text style={styles.infoValue}>{rx.notes}</Text>
            </View>
          )}
        </View>

        {/* Scan de l'ordonnance — indispensable pour valider en connaissance */}
        {rx?.mediaUrls && rx.mediaUrls.length > 0 && (
          <View style={styles.scanSection}>
            <Text style={styles.sectionTitle}>Scan de l'ordonnance</Text>
            {rx.mediaUrls.map((url, i) => {
              const base    = url.startsWith('http') ? url : `${API_URL}${url}`;
              const token   = useAuthStore.getState().token;
              const fullUrl = token ? `${base}${base.includes('?') ? '&' : '?'}token=${token}` : base;
              const isPdf   = url.toLowerCase().endsWith('.pdf');
              return isPdf ? (
                <Pressable key={i} style={styles.pdfBtn} onPress={() => Linking.openURL(fullUrl)}>
                  <Text style={{ fontSize: 20 }}>📄</Text>
                  <Text style={styles.pdfText}>Ouvrir le PDF de l'ordonnance</Text>
                </Pressable>
              ) : (
                <Pressable key={i} onPress={() => Linking.openURL(fullUrl)}>
                  <Image source={{ uri: fullUrl }} style={styles.scanImage} resizeMode="cover" />
                  <Text style={styles.scanHint}>Appuyer pour agrandir</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {isAlreadyHandled ? (
          <View style={styles.handledBox}>
            <Text style={styles.handledIcon}>ℹ️</Text>
            <Text style={styles.handledText}>Cette ordonnance a déjà été traitée ({rx?.status}).</Text>
          </View>
        ) : (
          <>
            {/* Mode toggle */}
            <View style={styles.modeRow}>
              {(['validate', 'reject'] as const).map((m) => (
                <Pressable
                  key={m}
                  style={[styles.modeBtn, mode === m && (m === 'validate' ? styles.modeBtnActive : styles.modeBtnDanger)]}
                  onPress={() => setMode(m)}
                >
                  <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                    {m === 'validate' ? '✓ Valider' : '✕ Refuser'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mode === 'validate' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Médicaments préparés</Text>

                {items.map((item) => (
                  <View key={item._key} style={styles.itemRow}>
                    <View style={styles.itemFields}>
                      <TextInput
                        style={styles.inputMed}
                        placeholder="Nom du médicament"
                        placeholderTextColor={colors.textDisabled}
                        value={item.name}
                        onChangeText={(v) => updateItem(item._key, 'name', v)}
                      />
                      <View style={styles.itemNumbers}>
                        <TextInput
                          style={[styles.inputSmall]}
                          placeholder="Qté"
                          placeholderTextColor={colors.textDisabled}
                          keyboardType="number-pad"
                          value={item.quantity > 0 ? String(item.quantity) : ''}
                          onChangeText={(v) => updateItem(item._key, 'quantity', v)}
                        />
                        <TextInput
                          style={[styles.inputSmall, styles.inputPrice]}
                          placeholder="Prix (FCFA)"
                          placeholderTextColor={colors.textDisabled}
                          keyboardType="number-pad"
                          value={item.unitPriceFcfa > 0 ? String(item.unitPriceFcfa) : ''}
                          onChangeText={(v) => updateItem(item._key, 'unitPriceFcfa', v)}
                        />
                      </View>

                      {/* Substitution : cet article remplace-t-il un produit prescrit ? */}
                      <Pressable style={styles.subToggle} onPress={() => toggleSubstituted(item._key)}>
                        <View style={[styles.subCheckbox, item.substituted && styles.subCheckboxOn]}>
                          {item.substituted && <Text style={styles.subCheckMark}>✓</Text>}
                        </View>
                        <Text style={styles.subToggleTxt}>Équivalent (produit prescrit indisponible)</Text>
                      </Pressable>
                      {item.substituted && (
                        <View style={styles.subFields}>
                          <TextInput
                            style={styles.inputMed}
                            placeholder="Produit initialement prescrit"
                            placeholderTextColor={colors.textDisabled}
                            value={item.originalName ?? ''}
                            onChangeText={(v) => updateItem(item._key, 'originalName', v)}
                          />
                          <TextInput
                            style={styles.inputMed}
                            placeholder="Motif (ex. rupture de stock)"
                            placeholderTextColor={colors.textDisabled}
                            value={item.substitutionReason ?? ''}
                            onChangeText={(v) => updateItem(item._key, 'substitutionReason', v)}
                          />
                          <Text style={styles.subHint}>
                            Le patient sera sollicité pour accepter, selon son consentement.
                          </Text>
                        </View>
                      )}
                    </View>
                    {items.length > 1 && (
                      <Pressable onPress={() => removeItem(item._key)} style={styles.removeBtn}>
                        <Text style={styles.removeTxt}>✕</Text>
                      </Pressable>
                    )}
                  </View>
                ))}

                <Pressable style={styles.addItemBtn} onPress={addItem}>
                  <Text style={styles.addItemText}>+ Ajouter un médicament</Text>
                </Pressable>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total patient</Text>
                  <Text style={styles.totalValue}>{formatFcfa(totalFcfa)}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Motif de refus</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Ex: Ordonnance illisible, médicament non disponible…"
                  placeholderTextColor={colors.textDisabled}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            )}

            <Button
              label={submitting ? 'En cours…' : mode === 'validate' ? 'Confirmer la validation' : 'Confirmer le refus'}
              onPress={submit}
              loading={submitting}
              variant={mode === 'reject' ? 'danger' : 'primary'}
            />
          </>
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
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  infoLabel: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  infoValue: { ...typography.bodyMedium, color: colors.text, flex: 2 },

  handledBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.infoSurface,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  handledIcon: { fontSize: 20 },
  handledText: { ...typography.body, color: colors.info, flex: 1 },

  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modeBtnActive:    { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  modeBtnDanger:    { borderColor: colors.error,   backgroundColor: colors.errorSurface   },
  modeBtnText:      { ...typography.label, color: colors.textSecondary },
  modeBtnTextActive:{ color: colors.primary },

  section:      { gap: spacing.md },
  sectionTitle: { ...typography.bodyMedium, color: colors.text },

  scanSection: { gap: spacing.sm },
  scanImage: {
    width: '100%',
    height: 220,
    borderRadius: radii.lg,
    backgroundColor: colors.border,
  },
  scanHint: { ...typography.small, color: colors.textDisabled, textAlign: 'center', marginTop: spacing.xs },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  pdfText: { ...typography.bodyMedium, color: colors.primary },

  itemRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  itemFields:{ flex: 1, gap: spacing.xs },
  inputMed: {
    ...typography.body,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  itemNumbers: { flexDirection: 'row', gap: spacing.sm },
  inputSmall: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    textAlign: 'center',
  },
  inputPrice: { flex: 2 },
  removeBtn:  { paddingTop: spacing.sm, paddingLeft: spacing.xs },
  removeTxt:  { ...typography.bodyMedium, color: colors.error },

  subToggle:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  subCheckbox: {
    width: 20, height: 20, borderRadius: radii.sm, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  subCheckboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  subCheckMark:  { ...typography.label, color: colors.textOnDark },
  subToggleTxt:  { ...typography.caption, color: colors.textSecondary, flex: 1 },
  subFields:     { gap: spacing.xs, marginTop: spacing.xs, paddingLeft: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.accent },
  subHint:       { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic' },

  addItemBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  addItemText: { ...typography.label, color: colors.primary },

  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.sm },
  totalLabel: { ...typography.bodyMedium, color: colors.textSecondary },
  totalValue: { ...typography.h3, color: colors.primary },

  textArea: {
    ...typography.body,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 100,
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
  },
});
