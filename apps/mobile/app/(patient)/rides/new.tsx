import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ridesService } from '../../../src/services/rides.service';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

const RIDE_TYPES = [
  { value: 'home',     label: 'Domicile',  emoji: '🏠', desc: 'Retour ou aller au domicile' },
  { value: 'hospital', label: 'Hôpital',   emoji: '🏥', desc: 'Transport vers l\'hôpital' },
  { value: 'exam',     label: 'Examen',    emoji: '🔬', desc: 'Transport pour un examen médical' },
] as const;

export default function NewRideScreen() {
  const router = useRouter();
  const [type, setType] = useState<'home' | 'hospital' | 'exam'>('hospital');
  const [originLandmark, setOriginLandmark] = useState('');
  const [destLandmark, setDestLandmark]     = useState('');
  const [notes, setNotes]                   = useState('');
  const [loading, setLoading]               = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (originLandmark.trim().length < 3) e.origin = 'Adresse de départ requise (min 3 caractères)';
    if (destLandmark.trim().length < 3) e.dest = 'Adresse d\'arrivée requise (min 3 caractères)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await ridesService.request({
        type,
        // Coordonnées Libreville par défaut — en production, utiliser expo-location
        originLat: 0.3924,
        originLng: 9.4536,
        originLandmark: originLandmark.trim(),
        destLat: 0.3924,
        destLng: 9.4536,
        destLandmark: destLandmark.trim(),
        notes: notes.trim() || undefined,
      });
      Alert.alert('Course demandée', 'Un chauffeur va prendre en charge votre demande.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'enregistrer la course. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Retour</Text>
        </Pressable>
        <Text style={styles.title}>Nouveau transport</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Type de transport */}
        <Text style={styles.sectionLabel}>Type de transport</Text>
        <View style={styles.typeRow}>
          {RIDE_TYPES.map((t) => (
            <Pressable
              key={t.value}
              style={[styles.typeCard, type === t.value && styles.typeCardActive]}
              onPress={() => setType(t.value)}
            >
              <Text style={styles.typeEmoji}>{t.emoji}</Text>
              <Text style={[styles.typeLabel, type === t.value && styles.typeLabelActive]}>
                {t.label}
              </Text>
              <Text style={styles.typeDesc}>{t.desc}</Text>
            </Pressable>
          ))}
        </View>

        {/* Adresses */}
        <View style={styles.form}>
          <Input
            label="Point de départ"
            placeholder="Ex : Hôpital Owendo, Libreville"
            value={originLandmark}
            onChangeText={setOriginLandmark}
            error={errors.origin}
            autoCapitalize="words"
          />
          <Input
            label="Destination"
            placeholder="Ex : Domicile, Quartier Louis"
            value={destLandmark}
            onChangeText={setDestLandmark}
            error={errors.dest}
            autoCapitalize="words"
          />
          <Input
            label="Notes (optionnel)"
            placeholder="Informations supplémentaires pour le chauffeur"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ height: 80, paddingTop: spacing.sm }}
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Le tarif sera estimé automatiquement et affiché avant la confirmation.
          </Text>
        </View>

        <Button label="Demander le transport" loading={loading} onPress={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  backBtn:  {},
  backText: { ...typography.body, color: colors.primary },
  title:    { ...typography.h3, color: colors.text },

  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },

  sectionLabel: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase' },

  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.card,
  },
  typeCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  typeEmoji:      { fontSize: 28 },
  typeLabel:      { ...typography.label, color: colors.textSecondary, textAlign: 'center' },
  typeLabelActive:{ color: colors.primary },
  typeDesc:       { ...typography.small, color: colors.textDisabled, textAlign: 'center' },

  form: { gap: spacing.md },

  infoBox: {
    backgroundColor: '#E0F2FE',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  infoText: { ...typography.caption, color: '#0369A1' },
});
