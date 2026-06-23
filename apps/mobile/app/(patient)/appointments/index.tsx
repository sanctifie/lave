import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AppointmentStatus } from '@mbolo/shared';
import { appointmentsService, AppointmentListItem } from '../../../src/services/appointments.service';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { fr } from '../../../src/i18n/fr';

type Tab = 'upcoming' | 'past' | 'cancelled';

const UPCOMING = new Set<string>([
  AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS,
]);
const PAST      = new Set<string>([AppointmentStatus.COMPLETED]);
const CANCELLED = new Set<string>([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]);

const TABS: { key: Tab; label: string }[] = [
  { key: 'upcoming',  label: 'À venir'   },
  { key: 'past',      label: 'Passées'   },
  { key: 'cancelled', label: 'Annulées'  },
];

function formatDatetime(iso: string | null) {
  if (!iso) return 'Immédiat';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }

const SPECIALTY_ICONS: Record<string, string> = {
  Généraliste: '🩺', Pédiatre: '👶', Cardiologue: '❤️', Dermatologue: '🔬',
};

export default function AppointmentsScreen() {
  const router = useRouter();
  const [tab, setTab]                   = useState<Tab>('upcoming');
  const [items, setItems]               = useState<AppointmentListItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await appointmentsService.list();
      setItems(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = items.filter((a) => {
    if (tab === 'upcoming')  return UPCOMING.has(a.status);
    if (tab === 'past')      return PAST.has(a.status);
    return CANCELLED.has(a.status);
  });

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{fr.appointment.title}</Text>
        <Pressable
          style={styles.newBtn}
          onPress={() => router.push('/appointments/new' as never)}
          accessibilityLabel={fr.appointment.bookNow}
        >
          <Text style={styles.newBtnText}>+ Consulter</Text>
        </Pressable>
      </View>

      {/* Tabs — Image 1 style */}
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.center} color={colors.primary} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{fr.common.error}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>{fr.common.retry}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(a) => a.id}
          contentContainerStyle={visible.length === 0 ? styles.center : styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🩺</Text>
              <Text style={styles.emptyText}>{fr.appointment.empty}</Text>
              <Pressable
                style={styles.emptyBtn}
                onPress={() => router.push('/appointments/new' as never)}
              >
                <Text style={styles.emptyBtnText}>{fr.appointment.bookNow}</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item: appt }) => (
            <View style={styles.card}>
              {/* Doctor avatar */}
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>
                  {SPECIALTY_ICONS[appt.doctorSpecialty] ?? '👨‍⚕️'}
                </Text>
              </View>

              {/* Info */}
              <View style={styles.cardBody}>
                <Text style={styles.doctorName}>Dr. {appt.doctorName}</Text>
                <Text style={styles.specialty}>{appt.doctorSpecialty}</Text>

                <View style={styles.dateRow}>
                  <Text style={styles.calIcon}>📅</Text>
                  <Text style={styles.datetime}>{formatDatetime(appt.scheduledAt)}</Text>
                </View>
              </View>

              {/* Right: badge + fee */}
              <View style={styles.cardRight}>
                <StatusBadge status={appt.status as AppointmentStatus} />
                <Text style={styles.fee}>{formatFcfa(appt.feeFcfa)}</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* FAB for immediate consult */}
      {tab === 'upcoming' && (
        <Pressable
          style={styles.fab}
          onPress={() => router.push('/appointments/new' as never)}
          accessibilityLabel={fr.appointment.bookNow}
        >
          <Text style={styles.fabText}>🩺 Consulter maintenant</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title:      { ...typography.h3, color: colors.text },
  newBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  newBtnText: { ...typography.label, color: colors.textOnDark },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive:     { borderBottomColor: colors.primary },
  tabText:       { ...typography.label, color: colors.textSecondary },
  tabTextActive: { color: colors.primary },

  list:   { padding: spacing.md, gap: spacing.md, paddingBottom: 96 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.card,
  },
  avatar: {
    width: 56, height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji:  { fontSize: 26 },
  cardBody:     { flex: 1, gap: spacing.xs },
  doctorName:   { ...typography.bodyMedium, color: colors.text },
  specialty:    { ...typography.caption, color: colors.primary },
  dateRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  calIcon:      { fontSize: 12 },
  datetime:     { ...typography.caption, color: colors.textSecondary },
  cardRight:    { alignItems: 'flex-end', gap: spacing.xs },
  fee:          { ...typography.label, color: colors.text },

  emptyBox:    { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  emptyIcon:   { fontSize: 48 },
  emptyText:   { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  emptyBtnText: { ...typography.label, color: colors.textOnDark },

  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  retryText: { ...typography.label, color: colors.primary },

  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.modal,
  },
  fabText: { ...typography.bodyMedium, color: colors.textOnDark },
});
