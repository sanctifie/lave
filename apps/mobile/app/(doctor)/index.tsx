import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { apiClient } from '../../src/services/client';
import { AppointmentStatus } from '@mbolo/shared';
import { colors, spacing, radii, typography, shadows } from '../../src/theme';

interface DoctorStats {
  todayCount: number;
  pendingImmediate: number;
  completedToday: number;
}

interface NextAppointment {
  id: string;
  patientName: string;
  type: string;
  scheduledAt: string | null;
  status: string;
}

export default function DoctorDashboard() {
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);

  const [available, setAvailable]   = useState(false);
  const [stats, setStats]           = useState<DoctorStats | null>(null);
  const [queue, setQueue]           = useState<NextAppointment[]>([]);
  const [loading, setLoading]       = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get<{ data: any[] }>('/appointments');
      const raw      = data.data ?? data;
      const appts    = raw.map((a: any) => ({
        id:          a.id,
        patientName: a.patient?.name ?? '—',
        type:        a.type,
        scheduledAt: a.scheduledAt ?? null,
        status:      a.status,
      })) as NextAppointment[];
      const pending = appts.filter((a) =>
        [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.WAITING_ROOM].includes(a.status as AppointmentStatus)
      );
      const done = appts.filter((a) => a.status === AppointmentStatus.COMPLETED);
      setQueue(pending.slice(0, 5));
      setStats({ todayCount: pending.length, pendingImmediate: pending.filter((a) => !a.scheduledAt).length, completedToday: done.length });
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleAvailability = async (val: boolean) => {
    setAvailable(val);
    try {
      await apiClient.patch('/doctors/me/availability', { isAvailable: val });
    } catch {
      setAvailable(!val);
    }
  };

  const initials = (user?.name ?? 'D').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Espace médecin</Text>
          <Text style={styles.name}>Dr. {user?.name ?? 'Médecin'}</Text>
        </View>
        <Pressable onPress={logout} style={styles.avatarCircle} accessibilityLabel="Se déconnecter">
          <Text style={styles.avatarText}>{initials}</Text>
        </Pressable>
      </View>

      {/* Availability toggle */}
      <View style={[styles.availCard, available && styles.availCardOn]}>
        <View style={styles.availInfo}>
          <Text style={styles.availIcon}>{available ? '🟢' : '🔴'}</Text>
          <View>
            <Text style={styles.availTitle}>{available ? 'Disponible' : 'Indisponible'}</Text>
            <Text style={styles.availSub}>
              {available ? 'Les patients peuvent vous consulter' : 'Aucune consultation immédiate'}
            </Text>
          </View>
        </View>
        <Switch
          value={available}
          onValueChange={toggleAvailability}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={available ? colors.primary : colors.textDisabled}
        />
      </View>

      {/* Banner */}
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerTitle}>Consultez à{'\n'}distance</Text>
          <Text style={styles.bannerSub}>Vidéo HD · Ordonnance digitale</Text>
        </View>
        <Text style={styles.bannerEmoji}>👨‍⚕️</Text>
      </View>

      {/* Stats */}
      <Text style={styles.sectionTitle}>Aujourd'hui</Text>
      <View style={styles.statsRow}>
        {[
          { label: 'En attente',   value: stats?.pendingImmediate ?? 0,  color: colors.warning, icon: '⏳' },
          { label: 'Prévues',      value: stats?.todayCount ?? 0,         color: colors.info,    icon: '📅' },
          { label: 'Terminées',    value: stats?.completedToday ?? 0,     color: colors.success, icon: '✅' },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={[styles.statValue, { color: s.color }]}>{loading ? '—' : s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Queue */}
      {queue.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>File d'attente</Text>
            <Pressable onPress={() => router.push('/(doctor)/appointments' as never)}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </Pressable>
          </View>
          {queue.map((appt) => (
            <Pressable
              key={appt.id}
              style={styles.queueCard}
              onPress={() => router.push(`/(doctor)/appointments/${appt.id}` as never)}
            >
              <View style={styles.queueAvatar}>
                <Text style={{ fontSize: 22 }}>👤</Text>
              </View>
              <View style={styles.queueBody}>
                <Text style={styles.queuePatient}>{appt.patientName}</Text>
                <Text style={styles.queueType}>
                  {appt.type === 'immediate' ? '⚡ Immédiat' : `📅 ${appt.scheduledAt ? new Date(appt.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}`}
                </Text>
              </View>
              <Pressable
                style={styles.joinBtn}
                onPress={() => router.push(`/(doctor)/appointments/${appt.id}` as never)}
              >
                <Text style={styles.joinBtnText}>Rejoindre</Text>
              </Pressable>
            </Pressable>
          ))}
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
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...typography.label, color: colors.textOnDark, fontSize: 14 },

  availCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.card,
  },
  availCardOn: { borderColor: colors.success, backgroundColor: colors.successSurface },
  availInfo:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  availIcon:   { fontSize: 22 },
  availTitle:  { ...typography.bodyMedium, color: colors.text },
  availSub:    { ...typography.caption, color: colors.textSecondary },

  banner: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.modal,
  },
  bannerTitle: { ...typography.h3, color: colors.textOnDark, lineHeight: 26 },
  bannerSub:   { ...typography.caption, color: colors.primaryLight, marginTop: spacing.xs },
  bannerEmoji: { fontSize: 52 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:  { ...typography.h3, color: colors.text },
  seeAll:        { ...typography.label, color: colors.primary },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.card,
  },
  statIcon:  { fontSize: 22 },
  statValue: { ...typography.h2, lineHeight: 32 },
  statLabel: { ...typography.small, color: colors.textSecondary, textAlign: 'center' },

  queueCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  queueAvatar: {
    width: 48, height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  queueBody:    { flex: 1, gap: spacing.xs },
  queuePatient: { ...typography.bodyMedium, color: colors.text },
  queueType:    { ...typography.caption, color: colors.textSecondary },
  joinBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  joinBtnText: { ...typography.label, color: colors.textOnDark },
});
