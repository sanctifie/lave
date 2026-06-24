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
import { useAuthStore } from '../../src/store/auth.store';
import { apiClient } from '../../src/services/client';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, radii, typography, shadows } from '../../src/theme';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
type BloodType = typeof BLOOD_TYPES[number];

interface PatientProfile {
  dateOfBirth: string | null;
  bloodType:   string | null;
  allergies:   string[];
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

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const [dob,       setDob]       = useState('');
  const [bloodType, setBloodType] = useState<BloodType | null>(null);
  const [allergies, setAllergies] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get<{ data: PatientProfile | null }>('/users/me/patient-profile');
      const p = data.data;
      if (p) {
        setDob(p.dateOfBirth ? formatDate(p.dateOfBirth) : '');
        setBloodType((p.bloodType as BloodType) ?? null);
        setAllergies(p.allergies.join(', '));
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
    setSaving(true);
    try {
      await apiClient.patch('/users/me/patient-profile', {
        dateOfBirth: isoDate,
        bloodType:   bloodType ?? null,
        allergies:   allergies.split(',').map((a) => a.trim()).filter(Boolean),
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
