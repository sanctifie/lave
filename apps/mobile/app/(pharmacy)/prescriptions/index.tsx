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
import { PrescriptionStatus } from '@mbolo/shared';
import { pharmacyService, InboxPrescription } from '../../../src/services/pharmacy.service';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

type Filter = 'pending' | 'validated' | 'rejected';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'pending',   label: 'À valider'  },
  { key: 'validated', label: 'Validées'   },
  { key: 'rejected',  label: 'Refusées'   },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function PharmacyPrescriptionsScreen() {
  const router = useRouter();
  const [filter, setFilter]   = useState<Filter>('pending');
  const [items, setItems]     = useState<InboxPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await pharmacyService.inbox();
      setItems(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusMap: Record<Filter, string> = {
    pending:   PrescriptionStatus.PENDING_VALIDATION,
    validated: PrescriptionStatus.VALIDATED,
    rejected:  PrescriptionStatus.REJECTED,
  };

  const visible = items.filter((i) => i.status === statusMap[filter]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Ordonnances reçues</Text>
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(f) => f.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item: f }) => (
          <Pressable
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </Pressable>
        )}
      />

      {loading ? (
        <ActivityIndicator style={styles.center} color={colors.primary} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Erreur de chargement</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i) => i.id}
          contentContainerStyle={visible.length === 0 ? styles.center : styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>Aucune ordonnance dans cette catégorie</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/(pharmacy)/prescriptions/${item.id}` as never)}
            >
              <View style={styles.iconBox}>
                <Text style={{ fontSize: 22 }}>📄</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.patient}>{item.patientName}</Text>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                <StatusBadge status={item.status as PrescriptionStatus} />
              </View>
              <Text style={styles.chevron}>›</Text>
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

  filterRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive:     { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  chipText:       { ...typography.label, color: colors.textSecondary },
  chipTextActive: { color: colors.primary },

  list:   { padding: spacing.md, gap: spacing.sm },
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
  iconBox: {
    width: 48, height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: spacing.xs },
  patient:  { ...typography.bodyMedium, color: colors.text },
  date:     { ...typography.caption, color: colors.textSecondary },
  chevron:  { ...typography.h3, color: colors.textDisabled },

  emptyBox:  { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  retryText: { ...typography.label, color: colors.primary },
});
