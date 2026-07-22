import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { notificationsService, AppNotification } from '../../src/services/notifications.service';
import { colors, spacing, radii, typography, shadows } from '../../src/theme';

function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'à l\'instant';
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems]     = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await notificationsService.list());
    } catch {
      /* liste vide */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasUnread = items.some((n) => !n.readAt);

  const markAll = async () => {
    await notificationsService.markAllRead().catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  };

  const open = async (n: AppNotification) => {
    if (!n.readAt) {
      await notificationsService.markRead(n.id).catch(() => {});
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    }
    // Redirection contextuelle simple selon le type et les données jointes.
    const d = n.data ?? {};
    if (d.orderId) router.push(`/(patient)/orders/${d.orderId}` as never);
    else if (d.appointmentId) router.push(`/(patient)/appointments/${d.appointmentId}` as never);
    else if (d.prescriptionId) router.push('/(patient)/prescriptions' as never);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable>
        <Text style={styles.pageTitle}>Notifications</Text>
        {hasUnread ? (
          <Pressable onPress={markAll}><Text style={styles.markAll}>Tout lire</Text></Pressable>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTxt}>Aucune notification pour l'instant.</Text>
        </View>
      ) : (
        items.map((n) => (
          <Pressable key={n.id} style={[styles.card, !n.readAt && styles.cardUnread]} onPress={() => open(n)}>
            {!n.readAt && <View style={styles.dot} />}
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, !n.readAt && { color: colors.text }]}>{n.title}</Text>
              <Text style={styles.body}>{n.body}</Text>
              <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: spacing.xl, marginBottom: spacing.xs,
  },
  back:      { ...typography.bodyMedium, color: colors.primary },
  pageTitle: { ...typography.h3, color: colors.text },
  markAll:   { ...typography.caption, color: colors.primary, width: 56, textAlign: 'right' },

  emptyBox: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 34 },
  emptyTxt:  { ...typography.body, color: colors.textSecondary },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, ...shadows.card,
  },
  cardUnread: { backgroundColor: colors.primarySurface },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  title: { ...typography.bodyMedium, color: colors.textSecondary },
  body:  { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  time:  { ...typography.small, color: colors.textDisabled, marginTop: 4 },
});
