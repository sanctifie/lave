import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppointmentStatus } from '@mbolo/shared';
import { apiClient } from '../../../src/services/client';
import { chatService } from '../../../src/services/chat.service';
import { appointmentsService, PatientRecord } from '../../../src/services/appointments.service';
import { Button } from '../../../src/components/ui/Button';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

interface ConsultationDetail {
  id: string;
  patientName: string;
  type: 'immediate' | 'scheduled';
  scheduledAt: string | null;
  status: string;
  feeFcfa: number;
  chiefComplaint: string | null;
  videoRoomUrl: string | null;
  prescriptionIssued: boolean;
}

export default function DoctorConsultationScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const [appt, setAppt]         = useState<ConsultationDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notes, setNotes]       = useState('');
  const [rxText, setRxText]     = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [record, setRecord]           = useState<PatientRecord | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get<{ data: any }>(`/appointments/${id}`);
      const raw = data.data ?? data;
      setAppt({
        id:                  raw.id,
        patientName:         raw.patient?.name ?? '—',
        type:                raw.type,
        scheduledAt:         raw.scheduledAt ?? null,
        status:              raw.status,
        feeFcfa:             raw.doctor?.consultationFeeFcfa ?? 0,
        chiefComplaint:      raw.notes ?? null,
        videoRoomUrl:        raw.consultation?.videoSession?.providerRoomUrl ?? null,
        prescriptionIssued:  !!raw.consultation?.prescription,
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de charger la consultation.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Dossier patient (allergies, groupe sanguin, dernières ordonnances) — le
  // médecin y a droit en tant que soignant assigné au RDV.
  useEffect(() => {
    appointmentsService.getPatientRecord(id).then(setRecord).catch(() => setRecord(null));
  }, [id]);

  const startConsultation = async () => {
    try {
      await apiClient.post(`/appointments/${id}/start`);
      await load();
    } catch {
      Alert.alert('Erreur', 'Impossible de démarrer la consultation.');
    }
  };

  const completeWithPrescription = async () => {
    if (!notes.trim()) { Alert.alert('', 'Ajoutez vos notes de consultation avant de terminer.'); return; }
    setSubmitting(true);
    try {
      await apiClient.post(`/appointments/${id}/complete`, {
        notes: notes.trim(),
        prescription: rxText.trim() || null,
      });
      Alert.alert('Consultation terminée', 'Vos notes ont été enregistrées.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Erreur', 'Impossible de terminer la consultation.');
    } finally {
      setSubmitting(false);
    }
  };

  const openChat = async () => {
    setOpeningChat(true);
    try {
      const conv = await chatService.getOrCreate('appointment', id);
      router.push(`/(doctor)/chat/${conv.id}` as never);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'ouvrir le chat');
    } finally {
      setOpeningChat(false);
    }
  };

  const formatFcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

  if (loading) return <ActivityIndicator style={styles.center} color={colors.primary} />;
  if (!appt)   return null;

  const isPending = [
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.WAITING_ROOM,
  ].includes(appt.status as AppointmentStatus);
  const isInProgress = appt.status === AppointmentStatus.IN_PROGRESS;
  const isDone      = appt.status === AppointmentStatus.COMPLETED;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable>
        <Text style={styles.pageTitle}>Consultation</Text>
        <StatusBadge status={appt.status as AppointmentStatus} />
      </View>

      {/* Patient card */}
      <View style={styles.patientCard}>
        <View style={styles.patientAvatar}>
          <Text style={{ fontSize: 28 }}>👤</Text>
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{appt.patientName}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaItem}>
              {appt.type === 'immediate' ? '⚡ Immédiat' : `📅 ${appt.scheduledAt ? new Date(appt.scheduledAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}`}
            </Text>
            <Text style={styles.metaItem}>💰 {formatFcfa(appt.feeFcfa)}</Text>
          </View>
        </View>
      </View>

      {/* Dossier patient — visible par le médecin assigné */}
      {record && (
        <View style={styles.recordCard}>
          <Text style={styles.recordTitle}>🗂️ Dossier patient</Text>

          {record.allergies.length > 0 ? (
            <View style={styles.allergyBox}>
              <Text style={styles.allergyLabel}>⚠️ Allergies</Text>
              <Text style={styles.allergyText}>{record.allergies.join(', ')}</Text>
            </View>
          ) : (
            <Text style={styles.recordMuted}>Aucune allergie déclarée</Text>
          )}

          <View style={styles.recordGrid}>
            {record.bloodType && (
              <View style={styles.recordChip}>
                <Text style={styles.recordChipLabel}>Groupe sanguin</Text>
                <Text style={styles.recordChipValue}>{record.bloodType}</Text>
              </View>
            )}
            {record.dateOfBirth && (
              <View style={styles.recordChip}>
                <Text style={styles.recordChipLabel}>Naissance</Text>
                <Text style={styles.recordChipValue}>
                  {new Date(record.dateOfBirth).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            )}
            <View style={styles.recordChip}>
              <Text style={styles.recordChipLabel}>Assurance</Text>
              <Text style={styles.recordChipValue}>
                {record.insuranceProvider === 'none' ? 'Aucune' : record.insuranceProvider.toUpperCase()}
              </Text>
            </View>
          </View>

          {record.recentPrescriptions.length > 0 && (
            <View style={styles.rxHistory}>
              <Text style={styles.rxHistoryLabel}>Dernières ordonnances</Text>
              {record.recentPrescriptions.map((rx) => (
                <View key={rx.id} style={styles.rxRow}>
                  <Text style={styles.rxDate}>
                    {new Date(rx.createdAt).toLocaleDateString('fr-FR')}
                  </Text>
                  <Text style={styles.rxNotes} numberOfLines={1}>
                    {rx.notes ?? rx.type}
                  </Text>
                  <Text style={styles.rxStatus}>{rx.status}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Chief complaint */}
      {appt.chiefComplaint && (
        <View style={styles.complaintCard}>
          <Text style={styles.complaintLabel}>Motif de consultation</Text>
          <Text style={styles.complaintText}>{appt.chiefComplaint}</Text>
        </View>
      )}

      {/* Video section */}
      {(isInProgress || isPending) && (
        <View style={styles.videoCard}>
          <Text style={styles.videoTitle}>📹 Vidéo consultation</Text>
          {appt.videoRoomUrl ? (
            <>
              <View style={styles.videoInfo}>
                <Text style={styles.videoActive}>Session active</Text>
              </View>
              {isInProgress && (
                <Button
                  label="Rejoindre la vidéo"
                  onPress={() => Linking.openURL(appt.videoRoomUrl!)}
                />
              )}
            </>
          ) : (
            <Text style={styles.videoHint}>La session démarrera automatiquement.</Text>
          )}
          {isPending && (
            <Button label="Démarrer la consultation" onPress={startConsultation} />
          )}
        </View>
      )}

      {/* Notes + prescription — only during/after */}
      {(isInProgress || isDone) && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes cliniques</Text>
            <TextInput
              style={[styles.textArea, isDone && styles.textAreaReadonly]}
              placeholder="Observations, diagnostics, recommandations…"
              placeholderTextColor={colors.textDisabled}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isDone}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ordonnance digitale (optionnel)</Text>
            <TextInput
              style={[styles.textArea, isDone && styles.textAreaReadonly]}
              placeholder="Médicaments prescrits, posologies…"
              placeholderTextColor={colors.textDisabled}
              value={rxText}
              onChangeText={setRxText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isDone}
            />
          </View>

          {isInProgress && (
            <Button
              label={submitting ? 'Enregistrement…' : 'Terminer la consultation'}
              onPress={completeWithPrescription}
              loading={submitting}
              disabled={submitting}
            />
          )}
        </>
      )}

      {isDone && (
        <View style={styles.doneBox}>
          <Text style={styles.doneIcon}>✅</Text>
          <Text style={styles.doneText}>Consultation terminée. Dossier enregistré.</Text>
        </View>
      )}

      {/* Bouton chat patient */}
      {!isDone && (
        <Pressable
          style={[styles.chatBtn, openingChat && styles.chatBtnDisabled]}
          onPress={openChat}
          disabled={openingChat}
        >
          {openingChat
            ? <ActivityIndicator color={colors.primary} />
            : <Text style={styles.chatBtnText}>💬 Contacter le patient</Text>
          }
        </Pressable>
      )}
    </ScrollView>
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
  },
  back:      { ...typography.bodyMedium, color: colors.primary },
  pageTitle: { ...typography.h3, color: colors.text },

  patientCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.card,
  },
  patientAvatar: {
    width: 64, height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  patientInfo:  { flex: 1, gap: spacing.xs },
  patientName:  { ...typography.h3, color: colors.text },
  metaRow:      { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  metaItem:     { ...typography.caption, color: colors.textSecondary },

  recordCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  recordTitle: { ...typography.bodyMedium, color: colors.text },
  recordMuted: { ...typography.caption, color: colors.textSecondary },
  allergyBox: {
    backgroundColor: colors.errorSurface,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  allergyLabel: { ...typography.label, color: colors.error },
  allergyText:  { ...typography.bodyMedium, color: colors.error },
  recordGrid:   { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  recordChip: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: 2,
    minWidth: 90,
  },
  recordChipLabel: { ...typography.caption, color: colors.textSecondary },
  recordChipValue: { ...typography.bodyMedium, color: colors.text },
  rxHistory:      { gap: spacing.xs },
  rxHistoryLabel: { ...typography.label, color: colors.textSecondary },
  rxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rxDate:   { ...typography.caption, color: colors.textSecondary, width: 74 },
  rxNotes:  { ...typography.caption, color: colors.text, flex: 1 },
  rxStatus: { ...typography.caption, color: colors.primary },

  complaintCard: {
    backgroundColor: colors.warningSurface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  complaintLabel: { ...typography.label, color: colors.warning },
  complaintText:  { ...typography.body, color: colors.text },

  videoCard: {
    backgroundColor: colors.primarySurface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  videoTitle:  { ...typography.bodyMedium, color: colors.primary },
  videoInfo:   { gap: spacing.xs },
  videoActive: { ...typography.label, color: colors.success },
  videoHint:   { ...typography.caption, color: colors.textSecondary },

  section:      { gap: spacing.sm },
  sectionTitle: { ...typography.bodyMedium, color: colors.text },

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
  textAreaReadonly: { backgroundColor: colors.background, color: colors.textSecondary },

  doneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSurface,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  doneIcon: { fontSize: 24 },
  doneText: { ...typography.bodyMedium, color: colors.success, flex: 1 },

  chatBtn: {
    borderWidth:  1.5,
    borderColor:  colors.primary,
    borderRadius: radii.lg,
    padding:      spacing.sm,
    alignItems:   'center',
  },
  chatBtnDisabled: { opacity: 0.5 },
  chatBtnText: { ...typography.body, color: colors.primary, fontWeight: '600' },
});
