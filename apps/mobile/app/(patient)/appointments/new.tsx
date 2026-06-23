import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { doctorsService, DoctorListItem } from '../../../src/services/doctors.service';
import { appointmentsService } from '../../../src/services/appointments.service';
import { Button } from '../../../src/components/ui/Button';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { fr } from '../../../src/i18n/fr';

type ConsultType = 'immediate' | 'scheduled';

const SPECIALTIES = [
  { key: '',             label: 'Tous',          icon: '🔍' },
  { key: 'Généraliste',  label: 'Généraliste',   icon: '🩺' },
  { key: 'Pédiatre',     label: 'Pédiatrie',     icon: '👶' },
  { key: 'Cardiologue',  label: 'Cardiologie',   icon: '❤️' },
  { key: 'Dermatologue', label: 'Dermatologie',  icon: '🔬' },
  { key: 'Pneumologue',  label: 'Pneumologie',   icon: '🫁' },
];

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }

export default function NewAppointmentScreen() {
  const router = useRouter();

  const [type, setType]                 = useState<ConsultType>('immediate');
  const [specialty, setSpecialty]       = useState('');
  const [doctors, setDoctors]           = useState<DoctorListItem[]>([]);
  const [loadingDr, setLoadingDr]       = useState(true);
  const [selectedDr, setSelectedDr]     = useState<DoctorListItem | null>(null);
  const [complaint, setComplaint]       = useState('');
  const [submitting, setSubmitting]     = useState(false);

  useEffect(() => {
    setLoadingDr(true);
    setSelectedDr(null);
    doctorsService
      .list({ specialty: specialty || undefined, availableNow: type === 'immediate' })
      .then(setDoctors)
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDr(false));
  }, [specialty, type]);

  const submit = async () => {
    if (!selectedDr) { Alert.alert('', 'Veuillez sélectionner un médecin.'); return; }
    setSubmitting(true);
    try {
      await appointmentsService.create({
        doctorId: selectedDr.id,
        type,
        chiefComplaint: complaint.trim() || undefined,
      });
      Alert.alert('Consultation créée !', 'Le médecin va vous rejoindre.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(fr.common.error, 'Impossible de créer la consultation. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Retour</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Nouvelle consultation</Text>
        <View style={{ width: 64 }} />
      </View>

      {/* Type */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Type de consultation</Text>
        <View style={styles.typeRow}>
          {([
            { key: 'immediate' as ConsultType, label: 'Immédiat',    icon: '⚡' },
            { key: 'scheduled' as ConsultType, label: 'Programmé',   icon: '📅' },
          ] as const).map((t) => (
            <Pressable
              key={t.key}
              style={[styles.typeCard, type === t.key && styles.typeCardActive]}
              onPress={() => setType(t.key)}
            >
              <Text style={styles.typeIcon}>{t.icon}</Text>
              <Text style={[styles.typeLabel, type === t.key && styles.typeLabelActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Specialty chips — Image 1 horizontal scroll */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Spécialité</Text>
        <FlatList
          horizontal
          data={SPECIALTIES}
          keyExtractor={(s) => s.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.specialtyRow}
          renderItem={({ item: sp }) => {
            const active = specialty === sp.key;
            return (
              <Pressable
                style={styles.specialtyItem}
                onPress={() => setSpecialty(sp.key)}
              >
                <View style={[styles.specialtyCircle, active && styles.specialtyCircleActive]}>
                  <Text style={styles.specialtyIcon}>{sp.icon}</Text>
                </View>
                <Text style={[styles.specialtyLabel, active && styles.specialtyLabelActive]}>
                  {sp.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Doctor list — Image 1 card style */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          {type === 'immediate' ? 'Médecins disponibles maintenant' : 'Choisir un médecin'}
        </Text>

        {loadingDr ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
        ) : doctors.length === 0 ? (
          <Text style={styles.noDoctors}>{fr.appointment.noDoctor}</Text>
        ) : (
          <View style={styles.doctorList}>
            {doctors.map((dr) => {
              const selected = selectedDr?.id === dr.id;
              return (
                <Pressable
                  key={dr.id}
                  style={[styles.doctorCard, selected && styles.doctorCardSelected]}
                  onPress={() => setSelectedDr(dr)}
                >
                  {/* Avatar */}
                  <View style={[styles.drAvatar, selected && styles.drAvatarSelected]}>
                    <Text style={{ fontSize: 22 }}>👨‍⚕️</Text>
                  </View>

                  {/* Info */}
                  <View style={styles.drInfo}>
                    <Text style={[styles.drName, selected && { color: colors.primary }]}>
                      Dr. {dr.name}
                    </Text>
                    <Text style={styles.drSpecialty}>{dr.specialty}</Text>
                    {/* Stars */}
                    <View style={styles.ratingRow}>
                      <Text style={styles.star}>★</Text>
                      <Text style={styles.rating}>
                        {dr.rating.toFixed(1)} ({dr.reviewCount})
                      </Text>
                    </View>
                  </View>

                  {/* Right: price + button */}
                  <View style={styles.drRight}>
                    <Text style={styles.fee}>{formatFcfa(dr.consultationFeeFcfa)}</Text>
                    <View style={[styles.bookBtn, selected && styles.bookBtnSelected]}>
                      <Text style={[styles.bookBtnText, selected && styles.bookBtnTextSelected]}>
                        {selected ? '✓ Choisi' : 'Choisir'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Chief complaint */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Motif de consultation (optionnel)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Décrivez brièvement votre problème…"
          placeholderTextColor={colors.textDisabled}
          value={complaint}
          onChangeText={setComplaint}
          multiline
          numberOfLines={3}
          maxLength={500}
        />
      </View>

      <Button
        label={submitting ? 'Création…' : fr.appointment.bookNow}
        onPress={submit}
        disabled={!selectedDr || submitting}
        loading={submitting}
      />
    </ScrollView>
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

  section:      { gap: spacing.md },
  sectionLabel: { ...typography.bodyMedium, color: colors.text },

  typeRow: { flexDirection: 'row', gap: spacing.md },
  typeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.card,
  },
  typeCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  typeIcon:       { fontSize: 28 },
  typeLabel:      { ...typography.label, color: colors.textSecondary },
  typeLabelActive:{ color: colors.primary },

  specialtyRow: { gap: spacing.md, paddingVertical: spacing.xs },
  specialtyItem: { alignItems: 'center', gap: spacing.xs, width: 72 },
  specialtyCircle: {
    width: 64, height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.card,
  },
  specialtyCircleActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  specialtyIcon:         { fontSize: 26 },
  specialtyLabel:        { ...typography.small, color: colors.textSecondary, textAlign: 'center' },
  specialtyLabelActive:  { color: colors.primary, fontWeight: '600' },

  doctorList: { gap: spacing.md },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.card,
  },
  doctorCardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  drAvatar: {
    width: 56, height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  drAvatarSelected: { backgroundColor: colors.primaryLight + '33' },
  drInfo:    { flex: 1, gap: spacing.xs },
  drName:    { ...typography.bodyMedium, color: colors.text },
  drSpecialty: { ...typography.caption, color: colors.textSecondary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  star:      { color: '#F59E0B', fontSize: 12 },
  rating:    { ...typography.small, color: colors.textSecondary },

  drRight:  { alignItems: 'flex-end', gap: spacing.sm },
  fee:      { ...typography.label, color: colors.text },
  bookBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  bookBtnSelected:     { backgroundColor: colors.primary },
  bookBtnText:         { ...typography.label, color: colors.primary },
  bookBtnTextSelected: { color: colors.textOnDark },

  noDoctors: { ...typography.body, color: colors.textSecondary, textAlign: 'center', padding: spacing.md },

  textArea: {
    ...typography.body,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 80,
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
  },
});
