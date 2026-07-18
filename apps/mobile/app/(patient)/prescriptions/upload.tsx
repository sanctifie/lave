import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { PrescriptionType, SubstitutionConsent } from '@mbolo/shared';
import { prescriptionsService } from '../../../src/services/prescriptions.service';
import { apiClient } from '../../../src/services/client';
import { Button } from '../../../src/components/ui/Button';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { fr } from '../../../src/i18n/fr';

interface PharmacyItem {
  id: string;
  legalName: string;
  address: string;
  isOnDuty?: boolean;
  openingHours?: string | null;
}

const CONSENT_OPTIONS: { value: SubstitutionConsent; label: string; hint: string }[] = [
  { value: SubstitutionConsent.ASK,   label: 'Me demander à chaque fois', hint: 'Le pharmacien propose, vous validez avant préparation (recommandé)' },
  { value: SubstitutionConsent.ALLOW, label: 'Oui, un équivalent me convient', hint: 'Le pharmacien peut remplacer directement, vous êtes notifié(e)' },
  { value: SubstitutionConsent.DENY,  label: 'Non, produit exact uniquement', hint: 'Aucun remplacement : si indisponible, la commande est suspendue' },
];

export default function UploadScreen() {
  const router = useRouter();

  const [scan, setScan]               = useState<{ uri: string; name: string; type: string } | null>(null);
  const [pharmacies, setPharmacies]   = useState<PharmacyItem[]>([]);
  const [pharmacyId, setPharmacyId]   = useState<string | null>(null);
  const [consent, setConsent]         = useState<SubstitutionConsent>(SubstitutionConsent.ASK);
  const [loadingPh, setLoadingPh]     = useState(true);
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => {
    apiClient
      .get<{ data: PharmacyItem[] }>('/partners?type=pharmacy')
      .then((r) => setPharmacies(r.data.data ?? r.data))
      .catch(() => {})
      .finally(() => setLoadingPh(false));
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorisez l\'accès à vos photos pour continuer.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const ext   = asset.uri.split('.').pop() ?? 'jpg';
      setScan({ uri: asset.uri, name: `scan.${ext}`, type: asset.mimeType ?? 'image/jpeg' });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorisez l\'accès à la caméra pour continuer.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setScan({ uri: asset.uri, name: 'scan.jpg', type: 'image/jpeg' });
    }
  };

  const submit = async () => {
    if (!scan)       { Alert.alert('', 'Veuillez ajouter le scan de l\'ordonnance.'); return; }
    if (!pharmacyId) { Alert.alert('', 'Veuillez choisir une pharmacie.'); return; }

    setSubmitting(true);
    try {
      await prescriptionsService.upload({
        type: PrescriptionType.DRUG,
        targetPartnerId: pharmacyId,
        substitutionConsent: consent,
        scan,
      });
      Alert.alert('Envoyée !', 'Votre ordonnance a été transmise à la pharmacie.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(fr.common.error, 'Impossible d\'envoyer l\'ordonnance. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!scan && !!pharmacyId && !submitting;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Retour</Text>
          </Pressable>
          <Text style={styles.pageTitle}>Nouvelle ordonnance</Text>
          <View style={{ width: 64 }} />
        </View>

        {/* Step 1 — Scan */}
        <View style={styles.section}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}><Text style={styles.stepNum}>1</Text></View>
            <Text style={styles.stepTitle}>Scan de l'ordonnance</Text>
          </View>

          {scan ? (
            <View style={styles.scanPreview}>
              <Text style={styles.scanIcon}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.scanName} numberOfLines={1}>{scan.name}</Text>
                <Text style={styles.scanHint}>Fichier sélectionné</Text>
              </View>
              <Pressable onPress={() => setScan(null)} style={styles.removeBtn}>
                <Text style={styles.removeTxt}>✕</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.uploadArea}>
              <Text style={styles.uploadIcon}>📸</Text>
              <Text style={styles.uploadTitle}>Ajoutez votre ordonnance</Text>
              <Text style={styles.uploadHint}>{fr.prescription.uploadHint}</Text>
              <View style={styles.uploadBtns}>
                <Pressable style={[styles.uploadAction, styles.uploadActionPrimary]} onPress={takePhoto}>
                  <Text style={styles.uploadActionTxtPrimary}>📷  Appareil photo</Text>
                </Pressable>
                <Pressable style={[styles.uploadAction, styles.uploadActionSecondary]} onPress={pickImage}>
                  <Text style={styles.uploadActionTxtSecondary}>🖼  Galerie</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Step 2 — Pharmacy */}
        <View style={styles.section}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}><Text style={styles.stepNum}>2</Text></View>
            <Text style={styles.stepTitle}>{fr.prescription.selectPharmacy}</Text>
          </View>

          {loadingPh ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : pharmacies.length === 0 ? (
            <Text style={styles.noPharmacy}>Aucune pharmacie disponible</Text>
          ) : (
            <View style={styles.pharmacyList}>
              {pharmacies.map((ph) => {
                const selected = pharmacyId === ph.id;
                return (
                  <Pressable
                    key={ph.id}
                    style={[styles.pharmacyCard, selected && styles.pharmacyCardSelected]}
                    onPress={() => setPharmacyId(ph.id)}
                  >
                    <View style={[styles.pharmacyRadio, selected && styles.pharmacyRadioSelected]}>
                      {selected && <View style={styles.pharmacyRadioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.pharmacyNameRow}>
                        <Text style={[styles.pharmacyName, selected && { color: colors.primary }]}>
                          {ph.legalName}
                        </Text>
                        {ph.isOnDuty && (
                          <View style={styles.dutyBadge}><Text style={styles.dutyBadgeTxt}>🌙 De garde</Text></View>
                        )}
                      </View>
                      <Text style={styles.pharmacyAddr}>
                        {ph.address}{ph.openingHours ? ` · ${ph.openingHours}` : ''}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Step 3 — Substitution consent */}
        <View style={styles.section}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}><Text style={styles.stepNum}>3</Text></View>
            <Text style={styles.stepTitle}>Produit indisponible ?</Text>
          </View>
          <Text style={styles.consentIntro}>
            Si un médicament n'est pas en stock, acceptez-vous un équivalent (générique)
            proposé par le pharmacien ?
          </Text>
          {CONSENT_OPTIONS.map((opt) => {
            const selected = consent === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.pharmacyCard, selected && styles.pharmacyCardSelected]}
                onPress={() => setConsent(opt.value)}
              >
                <View style={[styles.pharmacyRadio, selected && styles.pharmacyRadioSelected]}>
                  {selected && <View style={styles.pharmacyRadioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pharmacyName, selected && { color: colors.primary }]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.pharmacyAddr}>{opt.hint}</Text>
                </View>
              </Pressable>
            );
          })}
          <Text style={styles.consentLegal}>
            Le pharmacien reste seul juge de l'équivalence et vous confirmera tout remplacement.
          </Text>
        </View>

        {/* Submit */}
        <Button
          label={submitting ? 'Envoi en cours…' : fr.prescription.submit}
          onPress={submit}
          disabled={!canSubmit}
          loading={submitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  backBtn:   {},
  backText:  { ...typography.bodyMedium, color: colors.primary },
  pageTitle: { ...typography.h3, color: colors.text },

  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBadge: {
    width: 28, height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum:   { ...typography.label, color: colors.textOnDark },
  stepTitle: { ...typography.bodyMedium, color: colors.text },

  uploadArea: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  uploadIcon:    { fontSize: 40 },
  uploadTitle:   { ...typography.bodyMedium, color: colors.text },
  uploadHint:    { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  uploadBtns:    { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  uploadAction: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    alignItems: 'center',
  },
  uploadActionPrimary:      { backgroundColor: colors.primary },
  uploadActionSecondary:    { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary },
  uploadActionTxtPrimary:   { ...typography.label, color: colors.textOnDark },
  uploadActionTxtSecondary: { ...typography.label, color: colors.primary },

  scanPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySurface,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  scanIcon:  { fontSize: 24 },
  scanName:  { ...typography.bodyMedium, color: colors.text },
  scanHint:  { ...typography.caption, color: colors.textSecondary },
  removeBtn: { padding: spacing.xs },
  removeTxt: { ...typography.bodyMedium, color: colors.error },

  pharmacyList: { gap: spacing.sm },
  pharmacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  pharmacyCardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  pharmacyRadio: {
    width: 20, height: 20,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  pharmacyRadioSelected: { borderColor: colors.primary },
  pharmacyRadioDot: {
    width: 10, height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  pharmacyName: { ...typography.bodyMedium, color: colors.text },
  pharmacyNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  dutyBadge: { backgroundColor: colors.primarySurface, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  dutyBadgeTxt: { ...typography.small, color: colors.accent, fontWeight: '700' },
  pharmacyAddr: { ...typography.caption, color: colors.textSecondary },
  noPharmacy:   { ...typography.caption, color: colors.textSecondary, textAlign: 'center', padding: spacing.md },

  consentIntro: { ...typography.caption, color: colors.textSecondary },
  consentLegal: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.xs },
});
