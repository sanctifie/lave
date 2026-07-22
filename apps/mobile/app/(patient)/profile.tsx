import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { apiClient } from '../../src/services/client';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, radii, typography, shadows } from '../../src/theme';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
type BloodType = typeof BLOOD_TYPES[number];

const INSURERS = [
  { key: 'none',   label: 'Aucune' },
  { key: 'cnamgs', label: 'CNAMGS' },
  { key: 'cnss',   label: 'CNSS' },
] as const;
type Insurer = typeof INSURERS[number]['key'];

// Fonds (régime) CNAMGS : détermine le taux de prise en charge par défaut.
const INSURANCE_FUNDS = [
  { key: 'agent_public', label: 'Agent public' },
  { key: 'prive',        label: 'Salarié privé' },
  { key: 'gef',          label: 'GEF' },
] as const;
type Fund = 'none' | typeof INSURANCE_FUNDS[number]['key'];

interface PatientProfile {
  dateOfBirth: string | null;
  bloodType:   string | null;
  allergies:   string[];
  insuranceProvider?:     string | null;
  insuranceFund?:         string | null;
  insuranceNumber?:       string | null;
  insuranceCoverageRate?: number | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR');
}

function parseLocalDate(ddmmyyyy: string): string | null {
  const parts = ddmmyyyy.trim().split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00.000Z`);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

export default function PatientProfileScreen() {
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const [dob,       setDob]       = useState('');
  const [bloodType, setBloodType] = useState<BloodType | null>(null);
  const [allergies, setAllergies] = useState('');

  const [insurer,     setInsurer]     = useState<Insurer>('none');
  const [fund,        setFund]        = useState<Fund>('none');
  const [insNumber,   setInsNumber]   = useState('');
  const [coverageStr, setCoverageStr] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get<{ data: PatientProfile | null }>('/users/me/patient-profile');
      const p = data.data;
      if (p) {
        setDob(p.dateOfBirth ? formatDate(p.dateOfBirth) : '');
        setBloodType((p.bloodType as BloodType) ?? null);
        setAllergies(p.allergies.join(', '));
        setInsurer((p.insuranceProvider as Insurer) ?? 'none');
        setFund((p.insuranceFund as Fund) ?? 'none');
        setInsNumber(p.insuranceNumber ?? '');
        setCoverageStr(p.insuranceCoverageRate != null ? String(p.insuranceCoverageRate) : '');
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const isoDate = dob.trim() ? parseLocalDate(dob) : null;
    if (dob.trim() && !isoDate) {
      Alert.alert('Date invalide', 'Format attendu : JJ/MM/AAAA');
      return;
    }
    const hasInsurer = insurer !== 'none';
    const coverage = coverageStr.trim() ? parseInt(coverageStr, 10) : null;
    if (hasInsurer && coverage != null && (isNaN(coverage) || coverage < 0 || coverage > 100)) {
      Alert.alert('Taux invalide', 'Le taux de prise en charge doit être compris entre 0 et 100.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch('/users/me/patient-profile', {
        dateOfBirth: isoDate,
        bloodType:   bloodType ?? null,
        allergies:   allergies.split(',').map((a) => a.trim()).filter(Boolean),
        insuranceProvider:     insurer,
        insuranceFund:         insurer === 'cnamgs' ? fund : 'none',
        insuranceNumber:       hasInsurer ? (insNumber.trim() || null) : null,
        insuranceCoverageRate: hasInsurer ? coverage : null,
      });
      Alert.alert('Profil mis à jour', 'Vos informations médicales ont été enregistrées.');
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil.');
    } finally {
      setSaving(false);
    }
  };

  const initials = (user?.name ?? 'P').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Mon profil</Text>
          <Text style={styles.name}>{user?.name ?? 'Patient'}</Text>
        </View>
        <Pressable onPress={logout} style={styles.avatarCircle} accessibilityLabel="Se déconnecter">
          <Text style={styles.avatarText}>{initials}</Text>
        </Pressable>
      </View>

      {/* Accès « Mes proches » (aidants / comptes gérés) */}
      <Pressable style={styles.navCard} onPress={() => router.push('/(patient)/care' as never)}>
        <View style={styles.navIcon}><Text style={{ fontSize: 20 }}>👪</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.navTitle}>Mes proches</Text>
          <Text style={styles.navHint}>Gérer un aidant ou les comptes qui vous sont confiés</Text>
        </View>
        <Text style={styles.navChevron}>›</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <>
          {/* Medical info card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informations médicales</Text>
            <Text style={styles.cardHint}>
              Ces informations aident le médecin à vous prendre en charge rapidement.
            </Text>

            {/* Date of birth */}
            <View style={styles.field}>
              <Text style={styles.label}>Date de naissance</Text>
              <TextInput
                style={styles.input}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor={colors.textDisabled}
                value={dob}
                onChangeText={setDob}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            {/* Blood type */}
            <View style={styles.field}>
              <Text style={styles.label}>Groupe sanguin</Text>
              <View style={styles.bloodGrid}>
                {BLOOD_TYPES.map((bt) => (
                  <Pressable
                    key={bt}
                    style={[styles.bloodChip, bloodType === bt && styles.bloodChipSelected]}
                    onPress={() => setBloodType(bloodType === bt ? null : bt)}
                  >
                    <Text style={[styles.bloodChipText, bloodType === bt && styles.bloodChipTextSelected]}>
                      {bt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Allergies */}
            <View style={styles.field}>
              <Text style={styles.label}>Allergies connues</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="Ex : pénicilline, arachides, latex…"
                placeholderTextColor={colors.textDisabled}
                value={allergies}
                onChangeText={setAllergies}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Text style={styles.inputHint}>Séparez par des virgules</Text>
            </View>
          </View>

          {/* Assurance & tiers-payant */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Assurance & tiers-payant</Text>
            <Text style={styles.cardHint}>
              Avec le tiers-payant, vous ne réglez que votre part (ticket modérateur) ;
              votre caisse prend en charge le reste.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Organisme</Text>
              <View style={styles.bloodGrid}>
                {INSURERS.map((ins) => (
                  <Pressable
                    key={ins.key}
                    style={[styles.bloodChip, insurer === ins.key && styles.bloodChipSelected]}
                    onPress={() => setInsurer(ins.key)}
                  >
                    <Text style={[styles.bloodChipText, insurer === ins.key && styles.bloodChipTextSelected]}>
                      {ins.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {insurer === 'cnamgs' && (
              <View style={styles.field}>
                <Text style={styles.label}>Fonds (régime)</Text>
                <View style={styles.bloodGrid}>
                  {INSURANCE_FUNDS.map((f) => (
                    <Pressable
                      key={f.key}
                      style={[styles.bloodChip, fund === f.key && styles.bloodChipSelected]}
                      onPress={() => {
                        setFund(f.key);
                        // Pré-remplit le taux maladie ordinaire (80 %) si vide.
                        if (!coverageStr.trim()) setCoverageStr('80');
                      }}
                    >
                      <Text style={[styles.bloodChipText, fund === f.key && styles.bloodChipTextSelected]}>
                        {f.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.inputHint}>
                  Agent public, salarié du privé, ou Gabonais économiquement faible (GEF).
                </Text>
              </View>
            )}

            {insurer !== 'none' && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Numéro d'assuré</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex : 24-XXXXXX"
                    placeholderTextColor={colors.textDisabled}
                    value={insNumber}
                    onChangeText={setInsNumber}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Taux de prise en charge (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex : 80"
                    placeholderTextColor={colors.textDisabled}
                    value={coverageStr}
                    onChangeText={setCoverageStr}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                  <Text style={styles.inputHint}>
                    Part prise en charge par la caisse sur le prix des médicaments.
                  </Text>
                </View>
              </>
            )}
          </View>

          <Button
            label={saving ? 'Enregistrement…' : 'Sauvegarder'}
            onPress={save}
            loading={saving}
            disabled={saving}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  welcome: { ...typography.caption, color: colors.textSecondary },
  name:    { ...typography.h3, color: colors.text },
  avatarCircle: {
    width: 40, height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...typography.label, color: colors.textOnDark, fontSize: 14 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  cardTitle: { ...typography.h3, color: colors.text },
  cardHint:  { ...typography.caption, color: colors.textSecondary },

  navCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, ...shadows.card,
  },
  navIcon: {
    width: 40, height: 40, borderRadius: radii.full,
    backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center',
  },
  navTitle:   { ...typography.bodyMedium, color: colors.text },
  navHint:    { ...typography.caption, color: colors.textSecondary },
  navChevron: { ...typography.h3, color: colors.textSecondary },

  field: { gap: spacing.xs },
  label: { ...typography.label, color: colors.text },

  input: {
    ...typography.body,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  inputMulti:  { minHeight: 80, paddingTop: spacing.sm },
  inputHint:   { ...typography.small, color: colors.textDisabled },

  bloodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bloodChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
  },
  bloodChipSelected:     { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  bloodChipText:         { ...typography.label, color: colors.textSecondary },
  bloodChipTextSelected: { color: colors.primary },
});
