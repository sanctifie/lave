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
import { prescriptionsService, PrescriptionListItem } from '../../../src/services/prescriptions.service';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';
import { fr } from '../../../src/i18n/fr';

type Filter = 'all' | PrescriptionStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',                                    label: 'Toutes'     },
  { key: PrescriptionStatus.PENDING_VALIDATION,    label: 'En attente' },
  { key: PrescriptionStatus.VALIDATED,             label: 'Validées'   },
  { key: PrescriptionStatus.FILLED,                label: 'Préparées'  },
  { key: PrescriptionStatus.REJECTED,              label: 'Refusées'   },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function PrescriptionsScreen() {
  const router = useRouter();
  const [filter, setFilter]   = useState<Filter>('all');
  const [items, setItems]     = useState<PrescriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await prescriptionsService.list();
      setItems(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = filter === 'all' ? items : items.filter((i) => i.status === filter);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{fr.prescription.title}</Text>
        <Pressable
          style={styles.uploadBtn}
          onPress={() => router.push('/prescriptions/upload' as never)}
          accessibilityLabel={fr.prescription.upload}
        >
          <Text style={styles.uploadBtnText}>+ Envoyer</Text>
        </Pressable>
      </View>

      {/* Filter chips */}
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
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        )}
      />

      {/* List */}
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
          keyExtractor={(i) => i.id}
          contentContainerStyle={visible.length === 0 ? styles.center : styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>{fr.prescription.empty}</Text>
              <Text style={styles.emptyHint}>{fr.prescription.emptyHint}</Text>
              <Pressable
                style={styles.emptyBtn}
                onPress={() => router.push('/prescriptions/upload' as never)}
              >
                <Text style={styles.emptyBtnText}>{fr.prescription.upload}</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/(patient)/prescriptions/${item.id}` as never)}
            >
              <View style={styles.cardLeft}>
                <View style={styles.iconBox}>
                  <Text style={{ fontSize: 22 }}>📄</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>
                  {item.targetPartnerName ?? 'Pharmacie non choisie'}
                </Text>
                <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                <StatusBadge status={item.status as PrescriptionStatus} />
              </View>
              <Text style={styles.cardChevron}>›</Text>
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
  title:        { ...typography.h3, color: colors.text },
  uploadBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  uploadBtnText: { ...typography.label, color: colors.textOnDark },

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
  cardLeft: {},
  iconBox: {
    width: 48, height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody:    { flex: 1, gap: spacing.xs },
  cardTitle:   { ...typography.bodyMedium, color: colors.text },
  cardDate:    { ...typography.caption, color: colors.textSecondary },
  cardChevron: { ...typography.h3, color: colors.textDisabled },

  emptyBox:    { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  emptyIcon:   { fontSize: 48 },
  emptyText:   { ...typography.bodyMedium, color: colors.text, textAlign: 'center' },
  emptyHint:   { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
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
});
