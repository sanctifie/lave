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

type Tab = 'queue' | 'scheduled' | 'done';

const TABS: { key: Tab; label: string }[] = [
  { key: 'queue',     label: 'File immédiate' },
  { key: 'scheduled', label: 'Programmées'    },
  { key: 'done',      label: 'Terminées'      },
];

function formatTime(iso: string | null) {
  if (!iso) return 'Immédiat';
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }

export default function DoctorAppointmentsScreen() {
  const router = useRouter();
  const [tab, setTab]   = useState<Tab>('queue');
  const [items, setItems] = useState<AppointmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

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
    if (tab === 'queue')     return a.type === 'immediate' && [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(a.status as AppointmentStatus);
    if (tab === 'scheduled') return a.type === 'scheduled' && [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(a.status as AppointmentStatus);
    return [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW].includes(a.status as AppointmentStatus);
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Consultations</Text>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.center} color={colors.primary} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Erreur de chargement</Text>
          <Pressable onPress={load} style={styles.retryBtn}><Text style={styles.retryText}>Réessayer</Text></Pressable>
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
              <Text style={styles.emptyText}>Aucune consultation ici</Text>
            </View>
          }
          renderItem={({ item: appt }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/(doctor)/appointments/${appt.id}` as never)}
            >
              <View style={styles.avatar}>
                <Text style={{ fontSize: 22 }}>👤</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.patient}>{appt.doctorName}</Text>
                <Text style={styles.time}>{formatTime(appt.scheduledAt)}</Text>
                <View style={styles.tagRow}>
                  <View style={[styles.typeTag, appt.type === 'immediate' && styles.typeTagImmediate]}>
                    <Text style={styles.typeTagText}>{appt.type === 'immediate' ? '⚡ Immédiat' : '📅 Programmé'}</Text>
                  </View>
                  <StatusBadge status={appt.status as AppointmentStatus} />
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.fee}>{formatFcfa(appt.feeFcfa)}</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
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
  },
  title: { ...typography.h3, color: colors.text },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: spacing.sm + 2, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: colors.primary },
  tabText:       { ...typography.label, color: colors.textSecondary },
  tabTextActive: { color: colors.primary },

  list:   { padding: spacing.md, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  avatar: {
    width: 52, height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody:  { flex: 1, gap: spacing.xs },
  patient:   { ...typography.bodyMedium, color: colors.text },
  time:      { ...typography.caption, color: colors.textSecondary },
  tagRow:    { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  typeTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.border,
  },
  typeTagImmediate: { backgroundColor: '#FFF0EB' },
  typeTagText:      { ...typography.small, color: colors.text },
  cardRight:  { alignItems: 'flex-end', gap: spacing.xs },
  fee:        { ...typography.label, color: colors.primary },
  chevron:    { ...typography.h3, color: colors.textDisabled },

  emptyBox:  { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
  retryBtn:  { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.primary },
  retryText: { ...typography.label, color: colors.primary },
});
