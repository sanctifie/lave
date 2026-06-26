import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { appointmentsService, AppointmentDetail } from '../../../src/services/appointments.service';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { colors, spacing, radii, shadows, typography } from '../../../src/theme';

const STATUS_LABELS: Record<string, string> = {
  pending:      'En attente',
  confirmed:    'Confirmé',
  waiting_room: 'Salle d\'attente',
  in_progress:  'En cours',
  completed:    'Terminé',
  cancelled:    'Annulé',
  no_show:      'Absent',
};

const TYPE_LABELS: Record<string, string> = {
  immediate: 'Immédiate ⚡',
  scheduled: 'Programmée 📅',
};

export default function AppointmentDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const [appt, setAppt]             = useState<AppointmentDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [entering, setEntering]     = useState(false);

  const load = useCallback(async () => {
    try {
      setAppt(await appointmentsService.getById(id));
    } catch {
      Alert.alert('Erreur', 'Impossible de charger le rendez-vous');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = () => {
    Alert.alert('Annuler le RDV', 'Confirmer l\'annulation ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await appointmentsService.cancel(id);
            load();
          } catch (e: any) {
            Alert.alert('Erreur', e.message ?? 'Impossible d\'annuler');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!appt) return null;

  const consult     = appt.consultation;
  const isPaid      = consult?.transaction?.status === 'captured';
  const isCompleted = appt.status === 'completed';
  const canCancel   = ['pending', 'confirmed'].includes(appt.status);
  const durationMin = consult?.durationSeconds ? Math.ceil(consult.durationSeconds / 60) : null;

  const canEnterWaitingRoom = (() => {
    if (!['pending', 'confirmed'].includes(appt.status)) return false;
    if (appt.type !== 'scheduled' || !appt.scheduledAt) return false;
    const diffMs = new Date(appt.scheduledAt).getTime() - Date.now();
    return diffMs <= 10 * 60 * 1000;
  })();

  const handleEnterWaitingRoom = async () => {
    setEntering(true);
    try {
      const result = await appointmentsService.enterWaitingRoom(id);
      router.replace({
        pathname: '/(patient)/appointments/waiting-room' as any,
        params: {
          id,
          doctorName:      appt.doctor.user.name,
          doctorSpecialty: appt.doctor.specialty.name,
          doctorBusy:      result.doctorBusy ? '1' : '0',
          scheduledAt:     appt.scheduledAt ?? '',
        },
      });
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.error ?? 'Impossible d\'entrer en salle d\'attente');
      setEntering(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête médecin */}
      <View style={styles.card}>
        <View style={styles.doctorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {appt.doctor.user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{appt.doctor.user.name}</Text>
            <Text style={styles.specialty}>{appt.doctor.specialty.name}</Text>
          </View>
          <StatusBadge status={appt.status} label={STATUS_LABELS[appt.status]} />
        </View>

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Type</Text>
          <Text style={styles.metaValue}>{TYPE_LABELS[appt.type] ?? appt.type}</Text>
        </View>
        {appt.scheduledAt && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>
              {new Date(appt.scheduledAt).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          </View>
        )}
        {appt.notes && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Motif</Text>
            <Text style={styles.metaValue}>{appt.notes}</Text>
          </View>
        )}
      </View>

      {/* Résumé consultation */}
      {consult && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Consultation</Text>
          {durationMin !== null && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Durée</Text>
              <Text style={styles.metaValue}>{durationMin} min</Text>
            </View>
          )}
          {consult.serviceFeeFcfa !== null && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Frais totaux</Text>
              <Text style={styles.feeValue}>
                {consult.serviceFeeFcfa.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          )}
          {consult.videoFeeFcfa !== null && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>dont vidéo</Text>
              <Text style={styles.metaValue}>
                {consult.videoFeeFcfa.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          )}
          {consult.notes && (
            <View style={[styles.metaRow, { alignItems: 'flex-start' }]}>
              <Text style={styles.metaLabel}>Notes</Text>
              <Text style={[styles.metaValue, { flex: 1 }]}>{consult.notes}</Text>
            </View>
          )}

          {/* Vidéo — rejoindre */}
          {appt.status === 'in_progress' && consult.videoSession?.providerRoomUrl && (
            <Pressable
              style={styles.videoBtn}
              onPress={() => Linking.openURL(consult.videoSession!.providerRoomUrl)}
            >
              <Text style={styles.videoBtnText}>📹 Rejoindre la vidéo</Text>
            </Pressable>
          )}

          {/* Ordonnance */}
          {consult.prescription && (
            <View style={styles.prescriptionBanner}>
              <Text style={styles.prescriptionIcon}>📋</Text>
              <Text style={styles.prescriptionText}>
                Ordonnance émise — en attente de validation pharmacien
              </Text>
            </View>
          )}

          {/* Statut paiement */}
          {isCompleted && (
            <View style={styles.paymentRow}>
              {isPaid ? (
                <View style={styles.paidBadge}>
                  <Text style={styles.paidText}>✓ Payé</Text>
                </View>
              ) : (
                <Pressable
                  style={styles.payBtn}
                  onPress={() => router.push({
                    pathname: '/(patient)/appointments/pay' as any,
                    params: { consultationId: consult.id, amount: String(consult.serviceFeeFcfa ?? 0) },
                  })}
                >
                  <Text style={styles.payBtnText}>Payer maintenant</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}

      {/* Salle d'attente */}
      {canEnterWaitingRoom && (
        <Pressable
          style={[styles.waitingRoomBtn, entering && styles.waitingRoomBtnDisabled]}
          onPress={handleEnterWaitingRoom}
          disabled={entering}
        >
          {entering
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.waitingRoomBtnText}>⏳ Entrer en salle d'attente</Text>
          }
        </Pressable>
      )}

      {/* Actions */}
      {canCancel && (
        <Pressable
          style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]}
          onPress={handleCancel}
          disabled={cancelling}
        >
          {cancelling
            ? <ActivityIndicator color={colors.error} />
            : <Text style={styles.cancelBtnText}>Annuler le rendez-vous</Text>
          }
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.md, gap: spacing.md },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: colors.surface,
    borderRadius:    radii.lg,
    padding:         spacing.md,
    ...shadows.card,
  },
  sectionTitle: {
    ...typography.h3,
    color:        colors.text,
    marginBottom: spacing.sm,
  },

  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: colors.primarySurface,
    justifyContent:  'center',
    alignItems:      'center',
  },
  avatarText: { ...typography.h3, color: colors.primary },
  doctorInfo: { flex: 1 },
  doctorName: { ...typography.h3, color: colors.text },
  specialty:  { ...typography.caption, color: colors.primary },

  divider: {
    height:          1,
    backgroundColor: colors.border,
    marginVertical:  spacing.sm,
  },
  metaRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   spacing.xs,
  },
  metaLabel: { ...typography.caption, color: colors.textSecondary },
  metaValue: { ...typography.body, color: colors.text, textAlign: 'right', flex: 1, marginLeft: spacing.sm },
  feeValue:  { ...typography.h3, color: colors.primary, textAlign: 'right' },

  videoBtn: {
    backgroundColor: colors.primary,
    borderRadius:    radii.lg,
    padding:         spacing.sm,
    alignItems:      'center',
    marginTop:       spacing.sm,
  },
  videoBtnText: { ...typography.bodyMedium, color: colors.textOnDark },

  prescriptionBanner: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.xs,
    backgroundColor: colors.warningSurface,
    borderRadius:    radii.md,
    padding:         spacing.sm,
    marginTop:       spacing.sm,
  },
  prescriptionIcon: { fontSize: 18 },
  prescriptionText: { ...typography.caption, color: colors.warning, flex: 1 },

  paymentRow: { marginTop: spacing.md, alignItems: 'center' },
  paidBadge: {
    backgroundColor: colors.successSurface,
    borderRadius:    radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
  },
  paidText: { ...typography.body, color: colors.success, fontWeight: '600' },

  payBtn: {
    backgroundColor: colors.primary,
    borderRadius:    radii.full,
    paddingHorizontal: spacing.xxl,
    paddingVertical:   spacing.sm,
    ...shadows.card,
  },
  payBtnText: { ...typography.bodyMedium, color: colors.textOnDark, textAlign: 'center' },

  waitingRoomBtn: {
    backgroundColor: colors.primary,
    borderRadius:    radii.lg,
    padding:         spacing.md,
    alignItems:      'center',
    ...shadows.card,
  },
  waitingRoomBtnDisabled: { opacity: 0.6 },
  waitingRoomBtnText: { ...typography.bodyMedium, color: colors.textOnDark },

  cancelBtn: {
    borderWidth:   1.5,
    borderColor:   colors.error,
    borderRadius:  radii.lg,
    padding:       spacing.md,
    alignItems:    'center',
  },
  cancelBtnDisabled: { opacity: 0.5 },
  cancelBtnText: { ...typography.body, color: colors.error, fontWeight: '600' },
});
