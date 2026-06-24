import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { doctorsService, DoctorProfile, DoctorSpecialty, ScheduleSlot } from '../../src/services/doctors.service';
import { apiClient } from '../../src/services/client';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, radii, typography, shadows } from '../../src/theme';

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

interface DaySlot {
  active:       boolean;
  startTimeUtc: string;
  endTimeUtc:   string;
}

function buildDaySlots(availabilities: ScheduleSlot[]): DaySlot[] {
  return Array.from({ length: 7 }, (_, i) => {
    const found = availabilities.find((a) => a.dayOfWeek === i);
    return found
      ? { active: true,  startTimeUtc: found.startTimeUtc, endTimeUtc: found.endTimeUtc }
      : { active: false, startTimeUtc: '08:00',            endTimeUtc: '17:00' };
  });
}

export default function DoctorProfileScreen() {
  const router = useRouter();

  const [profile,      setProfile]      = useState<DoctorProfile | null>(null);
  const [specialties,  setSpecialties]  = useState<DoctorSpecialty[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);

  // Form state
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('');
  const [fee,                 setFee]                  = useState('');
  const [bio,                 setBio]                  = useState('');
  const [daySlots,            setDaySlots]             = useState<DaySlot[]>(buildDaySlots([]));
  const [showSpecialtyPicker, setShowSpecialtyPicker]  = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, specs] = await Promise.all([
        doctorsService.getMyProfile(),
        doctorsService.listSpecialties(),
      ]);
      setProfile(p);
      setSpecialties(specs);
      setSelectedSpecialtyId(p.specialtyId);
      setFee(String(p.consultationFeeFcfa));
      setBio(p.bio ?? '');
      setDaySlots(buildDaySlots(p.availabilities));
    } catch {
      Alert.alert('Erreur', 'Impossible de charger votre profil.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleDay = (i: number, val: boolean) => {
    setDaySlots((prev) => prev.map((d, idx) => idx === i ? { ...d, active: val } : d));
  };

  const updateDayTime = (i: number, field: 'startTimeUtc' | 'endTimeUtc', val: string) => {
    setDaySlots((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
  };

  const save = async () => {
    const feeNum = parseInt(fee, 10);
    if (isNaN(feeNum) || feeNum <= 0) {
      Alert.alert('', 'Le tarif doit être un nombre positif.');
      return;
    }

    const timeRe = /^\d{2}:\d{2}$/;
    for (let i = 0; i < 7; i++) {
      if (!daySlots[i].active) continue;
      if (!timeRe.test(daySlots[i].startTimeUtc) || !timeRe.test(daySlots[i].endTimeUtc)) {
        Alert.alert('', `Format d'heure invalide pour ${DAYS[i]}. Utilisez HH:MM.`);
        return;
      }
    }

    setSaving(true);
    try {
      await doctorsService.updateProfile({
        specialtyId:         selectedSpecialtyId || undefined,
        consultationFeeFcfa: feeNum,
        bio:                 bio.trim() || undefined,
      });

      const slots: ScheduleSlot[] = daySlots
        .map((d, i) => ({ dayOfWeek: i, startTimeUtc: d.startTimeUtc, endTimeUtc: d.endTimeUtc, active: d.active }))
        .filter((d) => d.active)
        .map(({ dayOfWeek, startTimeUtc, endTimeUtc }) => ({ dayOfWeek, startTimeUtc, endTimeUtc }));

      await doctorsService.updateSchedule(slots);

      Alert.alert('✅ Profil mis à jour', '', [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (val: boolean) => {
    if (!profile) return;
    setProfile({ ...profile, isAvailableNow: val });
    try {
      await apiClient.patch('/doctors/me/availability', { isAvailableNow: val });
    } catch {
      setProfile({ ...profile, isAvailableNow: !val });
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} color={colors.primary} />;
  if (!profile) return null;

  const selectedSpecialty = specialties.find((s) => s.id === selectedSpecialtyId);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable>
        <Text style={styles.title}>Mon profil</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Disponibilité immédiate */}
      <View style={[styles.availCard, profile.isAvailableNow && styles.availCardOn]}>
        <View style={styles.availInfo}>
          <Text style={styles.availIcon}>{profile.isAvailableNow ? '🟢' : '🔴'}</Text>
          <View>
            <Text style={styles.availTitle}>{profile.isAvailableNow ? 'Disponible maintenant' : 'Indisponible'}</Text>
            <Text style={styles.availSub}>
              {profile.isAvailableNow ? 'Les patients peuvent vous consulter' : 'Activez pour recevoir des patients'}
            </Text>
          </View>
        </View>
        <Switch
          value={profile.isAvailableNow}
          onValueChange={toggleAvailability}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={profile.isAvailableNow ? colors.primary : colors.textDisabled}
        />
      </View>

      {/* CNOM */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Numéro CNOM</Text>
        <Text style={styles.cnomValue}>{profile.cnomNumber}</Text>
        <Text style={styles.hint}>Non modifiable après enregistrement</Text>
      </View>

      {/* Spécialité */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Spécialité</Text>
        <Pressable style={styles.pickerBtn} onPress={() => setShowSpecialtyPicker((v) => !v)}>
          <Text style={styles.pickerBtnText}>{selectedSpecialty?.name ?? 'Sélectionner…'}</Text>
          <Text style={styles.pickerArrow}>{showSpecialtyPicker ? '▲' : '▼'}</Text>
        </Pressable>
        {showSpecialtyPicker && (
          <View style={styles.pickerList}>
            {specialties.map((s) => (
              <Pressable
                key={s.id}
                style={[styles.pickerItem, s.id === selectedSpecialtyId && styles.pickerItemSelected]}
                onPress={() => { setSelectedSpecialtyId(s.id); setShowSpecialtyPicker(false); }}
              >
                <Text style={[styles.pickerItemText, s.id === selectedSpecialtyId && styles.pickerItemTextSelected]}>
                  {s.name}
                </Text>
                {s.id === selectedSpecialtyId && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Tarif */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Tarif de consultation (FCFA)</Text>
        <TextInput
          style={styles.input}
          value={fee}
          onChangeText={setFee}
          keyboardType="numeric"
          placeholder="ex: 5000"
          placeholderTextColor={colors.textDisabled}
        />
      </View>

      {/* Bio */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Présentation (optionnel)</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={bio}
          onChangeText={setBio}
          placeholder="Décrivez votre parcours, votre approche…"
          placeholderTextColor={colors.textDisabled}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Planning hebdomadaire */}
      <Text style={styles.sectionTitle}>Créneaux hebdomadaires</Text>
      <Text style={styles.sectionSub}>Heures en UTC — Gabon est UTC+1 (retirez 1h de votre heure locale)</Text>

      {DAYS.map((day, i) => (
        <View key={i} style={styles.dayCard}>
          <View style={styles.dayHeader}>
            <Text style={[styles.dayName, !daySlots[i].active && styles.dayNameOff]}>{day}</Text>
            <Switch
              value={daySlots[i].active}
              onValueChange={(val) => toggleDay(i, val)}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={daySlots[i].active ? colors.primary : colors.textDisabled}
            />
          </View>
          {daySlots[i].active && (
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>Début</Text>
                <TextInput
                  style={styles.timeInput}
                  value={daySlots[i].startTimeUtc}
                  onChangeText={(v) => updateDayTime(i, 'startTimeUtc', v)}
                  placeholder="08:00"
                  placeholderTextColor={colors.textDisabled}
                  maxLength={5}
                />
              </View>
              <Text style={styles.timeSep}>→</Text>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>Fin</Text>
                <TextInput
                  style={styles.timeInput}
                  value={daySlots[i].endTimeUtc}
                  onChangeText={(v) => updateDayTime(i, 'endTimeUtc', v)}
                  placeholder="17:00"
                  placeholderTextColor={colors.textDisabled}
                  maxLength={5}
                />
              </View>
            </View>
          )}
        </View>
      ))}

      <Button label={saving ? 'Enregistrement…' : 'Enregistrer le profil'} onPress={save} disabled={saving} />
      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  center:  { flex: 1 },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingTop:     spacing.xl,
  },
  back:  { ...typography.body, color: colors.primary, width: 60 },
  title: { ...typography.h3, color: colors.text },

  availCard: {
    backgroundColor: colors.surface,
    borderRadius:    radii.lg,
    padding:         spacing.md,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    borderWidth:     1.5,
    borderColor:     colors.border,
    ...shadows.card,
  },
  availCardOn:  { borderColor: colors.success, backgroundColor: colors.successSurface },
  availInfo:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  availIcon:    { fontSize: 22 },
  availTitle:   { ...typography.bodyMedium, color: colors.text },
  availSub:     { ...typography.caption, color: colors.textSecondary },

  card: {
    backgroundColor: colors.surface,
    borderRadius:    radii.lg,
    padding:         spacing.md,
    gap:             spacing.sm,
    ...shadows.card,
  },
  cardLabel:  { ...typography.label, color: colors.textSecondary },
  cnomValue:  { ...typography.body, color: colors.text, fontWeight: '600' },
  hint:       { ...typography.small, color: colors.textDisabled },

  input: {
    backgroundColor: colors.background,
    borderRadius:    radii.md,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.sm,
    ...typography.body,
    color:           colors.text,
  },
  inputMultiline: { minHeight: 72 },

  pickerBtn: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    backgroundColor: colors.background,
    borderRadius:    radii.md,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.sm,
  },
  pickerBtnText:  { ...typography.body, color: colors.text },
  pickerArrow:    { ...typography.caption, color: colors.textSecondary },
  pickerList: {
    backgroundColor: colors.surface,
    borderRadius:    radii.md,
    borderWidth:     1,
    borderColor:     colors.border,
    overflow:        'hidden',
  },
  pickerItem: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemSelected: { backgroundColor: colors.primarySurface },
  pickerItemText:     { ...typography.body, color: colors.text },
  pickerItemTextSelected: { color: colors.primary, fontWeight: '600' },
  checkmark: { color: colors.primary, fontWeight: '700' },

  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xs },
  sectionSub:   { ...typography.small, color: colors.textSecondary, marginTop: -spacing.sm },

  dayCard: {
    backgroundColor: colors.surface,
    borderRadius:    radii.lg,
    padding:         spacing.md,
    gap:             spacing.sm,
    ...shadows.card,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName:   { ...typography.bodyMedium, color: colors.text },
  dayNameOff: { color: colors.textDisabled },

  timeRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeField: { flex: 1, gap: 4 },
  timeLabel: { ...typography.small, color: colors.textSecondary },
  timeInput: {
    backgroundColor: colors.background,
    borderRadius:    radii.md,
    borderWidth:     1,
    borderColor:     colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical:   spacing.xs,
    ...typography.body,
    color:           colors.text,
    textAlign:       'center',
  },
  timeSep: { ...typography.body, color: colors.textDisabled, marginTop: 16 },
});
