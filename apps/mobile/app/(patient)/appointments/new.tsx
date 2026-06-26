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
import { doctorsService, DoctorListItem, TimeSlot } from '../../../src/services/doctors.service';
import { appointmentsService } from '../../../src/services/appointments.service';
import { Button } from '../../../src/components/ui/Button';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { fr } from '../../../src/i18n/fr';

type ConsultType = 'immediate' | 'scheduled';

const SPECIALTIES = [
  { key: '',               label: 'Généraliste',    icon: '🩺' },
  { key: 'Pédiatre',       label: 'Pédiatre',       icon: '👶' },
  { key: 'Dermatologue',   label: 'Dermatologue',   icon: '🔬' },
  { key: 'Cardiologue',    label: 'Cardiologue',    icon: '❤️' },
  { key: 'Gynécologue',    label: 'Gynécologue',    icon: '🤱' },
  { key: 'Psychologue',    label: 'Psychologue',    icon: '🧠' },
  { key: 'Psychiatre',     label: 'Psychiatre',     icon: '💭' },
  { key: 'ORL',            label: 'ORL',            icon: '👂' },
  { key: 'Pneumologue',    label: 'Pneumologue',    icon: '🫁' },
  { key: 'Endocrinologue', label: 'Endocrinologue', icon: '⚗️' },
  { key: 'Diabétologue',   label: 'Diabétologue',   icon: '💉' },
  { key: 'Nutritionniste', label: 'Nutritionniste', icon: '🥗' },
  { key: 'Neurologue',     label: 'Neurologue',     icon: '🧬' },
  { key: 'Ophtalmologue',  label: 'Ophtalmologue',  icon: '👁️' },
  { key: 'Rhumatologue',   label: 'Rhumatologue',   icon: '🦴' },
  { key: 'Urologue',       label: 'Urologue',       icon: '🫀' },
];

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewAppointmentScreen() {
  const router = useRouter();

  const [specialty, setSpecialty]           = useState('');
  const [type, setType]                     = useState<ConsultType>('immediate');
  const [doctors, setDoctors]               = useState<DoctorListItem[]>([]);
  const [loadingDr, setLoadingDr]           = useState(false);
  const [selectedDr, setSelectedDr]         = useState<DoctorListItem | null>(null);
  const [complaint, setComplaint]           = useState('');
  const [submitting, setSubmitting]         = useState(false);

  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount]     = useState(true);

  // Scheduled: date + slots
  const [selectedDate, setSelectedDate]     = useState(todayISO());
  const [slots, setSlots]                   = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots]     = useState(false);
  const [selectedSlot, setSelectedSlot]     = useState<string | null>(null);

  useEffect(() => {
    setLoadingCount(true);
    doctorsService
      .countAvailableNow(specialty || undefined)
      .then((r) => setAvailableCount(r.count))
      .catch(() => setAvailableCount(0))
      .finally(() => setLoadingCount(false));
  }, [specialty]);

  useEffect(() => {
    if (type === 'immediate') { setDoctors([]); return; }
    setLoadingDr(true);
    setSelectedDr(null);
    setSelectedSlot(null);
    doctorsService
      .list({ specialty: specialty || undefined })
      .then(setDoctors)
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDr(false));
  }, [specialty, type]);

  // Load slots when doctor or date changes
  useEffect(() => {
    if (!selectedDr || type !== 'scheduled') { setSlots([]); return; }
    setLoadingSlots(true);
    setSelectedSlot(null);
    doctorsService
      .getSlots(selectedDr.id, selectedDate)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDr, selectedDate, type]);

  const immediateAvailable = (availableCount ?? 0) > 0;

  const canSubmit = type === 'immediate'
    ? immediateAvailable && !submitting
    : !!selectedDr && !!selectedSlot && !submitting;

  const submit = async () => {
    setSubmitting(true);
    try {
      if (type === 'immediate') {
        await appointmentsService.create({
          type:           'immediate',
          specialty:      specialty || undefined,
          chiefComplaint: complaint.trim() || undefined,
        });
        Alert.alert(
          'Demande envoyée',
          'Le premier professionnel disponible va vous prendre en charge. Vous serez notifié dès qu\'il démarre la consultation.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        await appointmentsService.create({
          doctorId:       selectedDr!.id,
          type:           'scheduled',
          scheduledAt:    selectedSlot!,
          chiefComplaint: complaint.trim() || undefined,
        });
        Alert.alert('Rendez-vous créé !', 'Le professionnel a été notifié.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch {
      Alert.alert(fr.common.error, 'Impossible de créer la consultation. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSpecialty = SPECIALTIES.find((s) => s.key === specialty);

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

      {/* Spécialité */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Quel professionnel voulez-vous consulter ?</Text>
        <FlatList
          horizontal
          data={SPECIALTIES}
          keyExtractor={(s) => s.key || '__general'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.specialtyRow}
          renderItem={({ item: sp }) => {
            const active = specialty === sp.key;
            return (
              <Pressable
                style={styles.specialtyItem}
                onPress={() => { setSpecialty(sp.key); setSelectedDr(null); setSelectedSlot(null); }}
              >
                <View style={[styles.specialtyCircle, active && styles.specialtyCircleActive]}>
                  <Text style={styles.specialtyIcon}>{sp.icon}</Text>
                </View>
                <Text style={[styles.specialtyLabel, active && styles.specialtyLabelActive]} numberOfLines={2}>
                  {sp.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Type */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Quand souhaitez-vous consulter ?</Text>
        <View style={styles.typeRow}>

          <Pressable
            style={[
              styles.typeCard,
              type === 'immediate' && styles.typeCardActive,
              !immediateAvailable && !loadingCount && styles.typeCardDisabled,
            ]}
            onPress={() => { if (immediateAvailable) setType('immediate'); }}
          >
            <Text style={styles.typeIcon}>⚡</Text>
            <Text style={[
              styles.typeLabel,
              type === 'immediate' && styles.typeLabelActive,
              !immediateAvailable && !loadingCount && styles.typeLabelDisabled,
            ]}>
              Maintenant
            </Text>
            {loadingCount ? (
              <ActivityIndicator size="small" color={colors.textDisabled} />
            ) : immediateAvailable ? (
              <Text style={styles.availableBadge}>
                {availableCount} libre{availableCount !== 1 ? 's' : ''}
              </Text>
            ) : (
              <Text style={styles.unavailableBadge}>Indisponible</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.typeCard, type === 'scheduled' && styles.typeCardActive]}
            onPress={() => setType('scheduled')}
          >
            <Text style={styles.typeIcon}>📅</Text>
            <Text style={[styles.typeLabel, type === 'scheduled' && styles.typeLabelActive]}>
              Programmer
            </Text>
            <Text style={styles.typeSubLabel}>Choisir un créneau</Text>
          </Pressable>
        </View>
      </View>

      {/* Contenu selon type */}
      {type === 'immediate' ? (
        <View style={styles.section}>
          {immediateAvailable ? (
            <View style={styles.immediateInfo}>
              <Text style={styles.immediateTitle}>
                {selectedSpecialty?.icon} Consultation {selectedSpecialty?.label ?? 'généraliste'} immédiate
              </Text>
              <Text style={styles.immediateText}>
                Le premier {selectedSpecialty?.label.toLowerCase() ?? 'médecin généraliste'} disponible vous
                prendra en charge. Vous serez notifié par une alerte dès qu'il démarre la session vidéo.
              </Text>
            </View>
          ) : (
            <View style={[styles.immediateInfo, styles.immediateInfoUnavailable]}>
              <Text style={styles.immediateTitle}>
                Aucun {selectedSpecialty?.label.toLowerCase() ?? 'médecin'} disponible en ce moment
              </Text>
              <Text style={styles.immediateText}>
                Tous les professionnels sont actuellement en consultation. Essayez de programmer
                un rendez-vous ou revenez dans quelques minutes.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <>
          {/* Sélection médecin */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {selectedSpecialty
                ? `Choisir un ${selectedSpecialty.label.toLowerCase()}`
                : 'Choisir un médecin généraliste'}
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
                      onPress={() => { setSelectedDr(dr); setSelectedSlot(null); }}
                    >
                      <View style={[styles.drAvatar, selected && styles.drAvatarSelected]}>
                        <Text style={{ fontSize: 22 }}>👨‍⚕️</Text>
                      </View>
                      <View style={styles.drInfo}>
                        <Text style={[styles.drName, selected && { color: colors.primary }]}>
                          Dr. {dr.name}
                        </Text>
                        <Text style={styles.drSpecialty}>{dr.specialty}</Text>
                        <View style={styles.ratingRow}>
                          <Text style={styles.star}>★</Text>
                          <Text style={styles.rating}>
                            {dr.rating.toFixed(1)} ({dr.reviewCount})
                          </Text>
                        </View>
                      </View>
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

          {/* Sélection date + créneau */}
          {selectedDr && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Choisir une date</Text>
              <TextInput
                style={styles.dateInput}
                value={selectedDate}
                onChangeText={(v) => { setSelectedDate(v); setSelectedSlot(null); }}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={colors.textDisabled}
                keyboardType="numeric"
                maxLength={10}
              />

              <Text style={[styles.sectionLabel, { marginTop: spacing.sm }]}>Créneaux disponibles</Text>
              {loadingSlots ? (
                <ActivityIndicator color={colors.primary} />
              ) : slots.length === 0 ? (
                <Text style={styles.noDoctors}>Aucun créneau pour cette date</Text>
              ) : (
                <View style={styles.slotGrid}>
                  {slots.map((slot) => {
                    const time = new Date(slot.datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    const isSelected = selectedSlot === slot.datetime;
                    return (
                      <Pressable
                        key={slot.datetime}
                        style={[
                          styles.slotBtn,
                          isSelected && styles.slotBtnSelected,
                          !slot.available && styles.slotBtnDisabled,
                        ]}
                        onPress={() => slot.available && setSelectedSlot(slot.datetime)}
                        disabled={!slot.available}
                      >
                        <Text style={[
                          styles.slotText,
                          isSelected && styles.slotTextSelected,
                          !slot.available && styles.slotTextDisabled,
                        ]}>
                          {time}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </>
      )}

      {/* Motif */}
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
        disabled={!canSubmit}
        loading={submitting}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },

  topBar: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingTop:     spacing.xl,
    marginBottom:   spacing.sm,
  },
  backBtn:   {},
  backText:  { ...typography.bodyMedium, color: colors.primary },
  pageTitle: { ...typography.h3, color: colors.text },

  section:      { gap: spacing.sm },
  sectionLabel: { ...typography.bodyMedium, color: colors.text },

  specialtyRow:          { gap: spacing.md, paddingVertical: spacing.xs },
  specialtyItem:         { alignItems: 'center', gap: spacing.xs, width: 72 },
  specialtyCircle: {
    width: 60, height: 60,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.card,
  },
  specialtyCircleActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  specialtyIcon:         { fontSize: 24 },
  specialtyLabel:        { ...typography.small, color: colors.textSecondary, textAlign: 'center' },
  specialtyLabelActive:  { color: colors.primary, fontWeight: '600' },

  typeRow: { flexDirection: 'row', gap: spacing.md },
  typeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.card,
  },
  typeCardActive:    { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  typeCardDisabled:  { opacity: 0.45 },
  typeIcon:          { fontSize: 28 },
  typeLabel:         { ...typography.label, color: colors.textSecondary },
  typeLabelActive:   { color: colors.primary },
  typeLabelDisabled: { color: colors.textDisabled },
  typeSubLabel:      { ...typography.small, color: colors.textDisabled },

  availableBadge:   { ...typography.small, color: '#16A34A', fontWeight: '600' },
  unavailableBadge: { ...typography.small, color: colors.textDisabled },

  immediateInfo: {
    backgroundColor: colors.primarySurface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  immediateInfoUnavailable: { backgroundColor: colors.surface, borderColor: colors.border },
  immediateTitle: { ...typography.bodyMedium, color: colors.text },
  immediateText:  { ...typography.body, color: colors.textSecondary, lineHeight: 20 },

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
    width: 52, height: 52,
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
  drRight:   { alignItems: 'flex-end', gap: spacing.sm },
  fee:       { ...typography.label, color: colors.text },
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

  dateInput: {
    ...typography.body,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },

  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  slotBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  slotBtnDisabled: { opacity: 0.4 },
  slotText:        { ...typography.label, color: colors.text },
  slotTextSelected:{ color: colors.primary },
  slotTextDisabled:{ color: colors.textDisabled },

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
