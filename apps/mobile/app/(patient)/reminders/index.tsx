import React, { useCallback, useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import {
  scheduleMedicationReminders,
  listReminders,
  cancelReminderGroup,
  parsePosology,
  ReminderGroup,
} from '../../../src/services/reminders.service';

// Créneaux proposés (le patient coche ceux qui conviennent).
const SLOTS: { key: string; label: string; time: string }[] = [
  { key: 'morning', label: '🌅 Matin',  time: '08:00' },
  { key: 'noon',    label: '☀️ Midi',   time: '12:00' },
  { key: 'evening', label: '🌆 Soir',   time: '19:00' },
  { key: 'night',   label: '🌙 Coucher', time: '22:00' },
];

const DURATIONS = [3, 5, 7, 10, 14, 30];

function formatNext(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleString('fr-FR', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function RemindersScreen() {
  const router = useRouter();

  const [groups, setGroups]   = useState<ReminderGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire
  const [medication, setMedication] = useState('');
  const [slots, setSlots]           = useState<Record<string, boolean>>({ morning: true });
  const [duration, setDuration]     = useState(7);
  const [saving, setSaving]         = useState(false);
  // Lecture IA de la posologie (texte libre → créneaux)
  const [posology, setPosology]     = useState('');
  const [parsing, setParsing]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGroups(await listReminders());
    } catch {
      /* liste vide en cas d'erreur */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSlot = (key: string) => setSlots((p) => ({ ...p, [key]: !p[key] }));

  // Un horaire "HH:MM" → créneau le plus proche du formulaire.
  const slotForTime = (t: string): string => {
    const h = parseInt(t.split(':')[0], 10);
    if (h < 11) return 'morning';
    if (h < 14) return 'noon';
    if (h < 21) return 'evening';
    return 'night';
  };

  // Analyse la posologie collée et pré-remplit créneaux + durée (l'IA propose,
  // le patient ajuste). Sans IA configurée → invite à cocher manuellement.
  const analysePosology = async () => {
    const text = posology.trim();
    if (!text) return;
    setParsing(true);
    try {
      const parsed = await parsePosology(text);
      if (!parsed || parsed.times.length === 0) {
        Alert.alert('Analyse indisponible', 'Cochez les moments de prise manuellement ci-dessous.');
        return;
      }
      const next: Record<string, boolean> = {};
      parsed.times.forEach((t) => { next[slotForTime(t)] = true; });
      setSlots(next);
      if (parsed.durationDays > 0) {
        const nearest = DURATIONS.reduce((a, b) => (Math.abs(b - parsed.durationDays) < Math.abs(a - parsed.durationDays) ? b : a));
        setDuration(nearest);
      }
    } finally {
      setParsing(false);
    }
  };

  const save = async () => {
    const name = medication.trim();
    if (!name) { Alert.alert('', 'Indiquez le nom du médicament.'); return; }
    const times = SLOTS.filter((s) => slots[s.key]).map((s) => s.time);
    if (times.length === 0) { Alert.alert('', 'Choisissez au moins un moment de prise.'); return; }

    setSaving(true);
    try {
      const { scheduled } = await scheduleMedicationReminders({ medication: name, times, durationDays: duration });
      if (scheduled === 0) {
        Alert.alert('Aucun rappel', 'Tous les créneaux choisis sont déjà passés aujourd\'hui. Essayez une durée plus longue ou d\'autres moments.');
      } else {
        Alert.alert('Rappels programmés', `${scheduled} rappel(s) planifié(s) pour ${name}.`);
        setMedication('');
        setSlots({ morning: true });
        setDuration(7);
      }
      await load();
    } catch {
      Alert.alert('Erreur', 'Impossible de programmer les rappels. Vérifiez les autorisations de notification.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (g: ReminderGroup) => {
    Alert.alert('Supprimer le rappel', `Arrêter les rappels pour ${g.medication} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => { await cancelReminderGroup(g.groupId); await load(); },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable>
          <Text style={styles.pageTitle}>Rappels de prise</Text>
          <View style={{ width: 56 }} />
        </View>

        <Text style={styles.intro}>
          Vos rappels sont sauvegardés sur votre compte — ils vous suivent même en
          cas de changement de téléphone.
        </Text>

        {/* Formulaire */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Nouveau rappel</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom du médicament (ex. Amoxicilline)"
            placeholderTextColor={colors.textDisabled}
            value={medication}
            onChangeText={setMedication}
          />

          <Text style={styles.fieldLabel}>Posologie (facultatif — remplissage assisté)</Text>
          <TextInput
            style={[styles.input, { minHeight: 44 }]}
            placeholder="Ex. 1 comprimé matin et soir pendant 7 jours"
            placeholderTextColor={colors.textDisabled}
            value={posology}
            onChangeText={setPosology}
            multiline
          />
          <Pressable
            style={[styles.analyseBtn, (parsing || !posology.trim()) && { opacity: 0.5 }]}
            disabled={parsing || !posology.trim()}
            onPress={analysePosology}
          >
            <Text style={styles.analyseBtnTxt}>{parsing ? 'Analyse…' : '✨ Pré-remplir depuis la posologie'}</Text>
          </Pressable>

          <Text style={styles.fieldLabel}>Moments de prise</Text>
          <View style={styles.slotRow}>
            {SLOTS.map((s) => {
              const on = !!slots[s.key];
              return (
                <Pressable key={s.key} style={[styles.slot, on && styles.slotOn]} onPress={() => toggleSlot(s.key)}>
                  <Text style={[styles.slotTxt, on && styles.slotTxtOn]}>{s.label}</Text>
                  <Text style={[styles.slotTime, on && styles.slotTxtOn]}>{s.time}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Durée du traitement</Text>
          <View style={styles.durRow}>
            {DURATIONS.map((d) => {
              const on = duration === d;
              return (
                <Pressable key={d} style={[styles.dur, on && styles.durOn]} onPress={() => setDuration(d)}>
                  <Text style={[styles.durTxt, on && styles.durTxtOn]}>{d} j</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} disabled={saving} onPress={save}>
            <Text style={styles.saveBtnTxt}>{saving ? 'Programmation…' : 'Programmer les rappels'}</Text>
          </Pressable>
        </View>

        {/* Liste des rappels actifs */}
        <Text style={styles.sectionTitle}>Rappels actifs</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
        ) : groups.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>⏰</Text>
            <Text style={styles.emptyTxt}>Aucun rappel programmé pour l'instant.</Text>
          </View>
        ) : (
          groups.map((g) => (
            <View key={g.groupId} style={styles.reminderCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reminderName}>{g.medication}</Text>
                <Text style={styles.reminderMeta}>
                  {g.times.join(' · ')} — {g.remaining} prise(s) à venir
                </Text>
                <Text style={styles.reminderNext}>Prochain : {formatNext(g.nextAt)}</Text>
              </View>
              <Pressable onPress={() => remove(g)} style={styles.delBtn}>
                <Text style={styles.delTxt}>Arrêter</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
  },
  back:      { ...typography.bodyMedium, color: colors.primary },
  pageTitle: { ...typography.h3, color: colors.text },

  intro: { ...typography.caption, color: colors.textSecondary },

  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  sectionTitle: { ...typography.bodyMedium, color: colors.text },
  fieldLabel:   { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  input: {
    ...typography.body,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },

  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    flexGrow: 1,
    minWidth: '46%',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  slotOn:     { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  slotTxt:    { ...typography.label, color: colors.textSecondary },
  slotTime:   { ...typography.small, color: colors.textDisabled },
  slotTxtOn:  { color: colors.primary },

  durRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dur: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  durOn:    { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  durTxt:   { ...typography.label, color: colors.textSecondary },
  durTxtOn: { color: colors.primary },

  saveBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnTxt: { ...typography.bodyMedium, color: colors.textOnDark },

  analyseBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  analyseBtnTxt: { ...typography.label, color: colors.primary },

  emptyBox: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  emptyIcon: { fontSize: 32 },
  emptyTxt:  { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadows.card,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  reminderName: { ...typography.bodyMedium, color: colors.text },
  reminderMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  reminderNext: { ...typography.small, color: colors.accent, marginTop: 2 },
  delBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  delTxt: { ...typography.label, color: colors.error },
});
