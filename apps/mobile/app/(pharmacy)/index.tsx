import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { Switch } from 'react-native';
import { pharmacyService, InboxPrescription, PharmacyOrder, PharmacyStats, PartnerProfileLite } from '../../src/services/pharmacy.service';
import { colors, spacing, radii, typography, shadows } from '../../src/theme';
import { OrderStatus, PrescriptionStatus } from '@mbolo/shared';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }

export default function PharmacyDashboard() {
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);

  const [inbox, setInbox]     = useState<InboxPrescription[]>([]);
  const [orders, setOrders]   = useState<PharmacyOrder[]>([]);
  const [stats, setStats]     = useState<PharmacyStats | null>(null);
  const [profile, setProfile] = useState<PartnerProfileLite | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [rx, ord, st, prof] = await Promise.all([
        pharmacyService.inbox(),
        pharmacyService.listOrders(),
        pharmacyService.stats().catch(() => null),
        pharmacyService.myProfile().catch(() => null),
      ]);
      setInbox(rx);
      setOrders(ord);
      setStats(st);
      setProfile(prof);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const toggleDuty = async (value: boolean) => {
    setProfile((p) => (p ? { ...p, isOnDuty: value } : p)); // optimiste
    try {
      const updated = await pharmacyService.setDuty(value);
      setProfile(updated);
    } catch {
      setProfile((p) => (p ? { ...p, isOnDuty: !value } : p)); // rollback
    }
  };

  useEffect(() => { load(); }, [load]);

  const pendingRx    = inbox.filter((r) => r.status === PrescriptionStatus.PENDING_VALIDATION).length;
  const newOrders    = orders.filter((o) => o.status === OrderStatus.PENDING_PHARMACY);
  const activeOrders = orders.filter((o) =>
    [OrderStatus.PHARMACY_ACCEPTED, OrderStatus.PREPARING].includes(o.status as OrderStatus)
  ).length;
  const readyOrders  = orders.filter((o) => o.status === OrderStatus.READY_FOR_PICKUP).length;

  const initials = (user?.name ?? 'P').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Espace pharmacie</Text>
          <Text style={styles.name}>{user?.name ?? 'Pharmacien'}</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={logout} style={styles.avatarCircle} accessibilityLabel="Se déconnecter">
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        </View>
      </View>

      {/* Banner */}
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerTitle}>Gérez vos{'\n'}ordonnances</Text>
          <Text style={styles.bannerSub}>Validez, préparez, livrez</Text>
        </View>
        <Text style={styles.bannerEmoji}>💊</Text>
      </View>

      {/* Pharmacie de garde */}
      <View style={styles.dutyCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dutyTitle}>🌙 Pharmacie de garde</Text>
          <Text style={styles.dutySub}>
            {profile?.isOnDuty ? 'Mise en avant auprès des patients — vous captez les urgences.' : 'Activez pour être prioritaire la nuit et les jours fériés.'}
          </Text>
        </View>
        <Switch
          value={!!profile?.isOnDuty}
          onValueChange={toggleDuty}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.surface}
        />
      </View>

      {/* Mon activité (business) */}
      <Text style={styles.sectionTitle}>Mon activité</Text>
      <View style={styles.bizRow}>
        {[
          { label: 'CA médicaments',  value: stats ? fcfa(stats.revenueFcfa) : '—', icon: '💰' },
          { label: 'Panier moyen',    value: stats ? fcfa(stats.avgBasketFcfa) : '—', icon: '🧺' },
          { label: 'Conseils vendus', value: stats ? String(stats.adviceCount) : '—', icon: '💡' },
        ].map((s) => (
          <View key={s.label} style={styles.bizCard}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={styles.bizValue}>{loading ? '—' : s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Raccourcis */}
      <View style={styles.shortcutRow}>
        <Pressable style={styles.shortcut} onPress={() => router.push('/(pharmacy)/earnings' as never)}>
          <Text style={styles.shortcutIcon}>💰</Text><Text style={styles.shortcutTxt}>Encaissements</Text>
        </Pressable>
        <Pressable style={styles.shortcut} onPress={() => router.push('/(pharmacy)/insurance' as never)}>
          <Text style={styles.shortcutIcon}>🧾</Text><Text style={styles.shortcutTxt}>Tiers-payant</Text>
        </Pressable>
        <Pressable style={styles.shortcut} onPress={() => router.push('/(pharmacy)/catalog' as never)}>
          <Text style={styles.shortcutIcon}>📦</Text><Text style={styles.shortcutTxt}>Catalogue</Text>
        </Pressable>
      </View>

      {/* Stats */}
      <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
      <View style={styles.statsRow}>
        {[
          { label: 'Ordonnances\nen attente', value: pendingRx,          color: colors.warning, icon: '📋' },
          { label: 'Commandes\nen cours',     value: activeOrders,        color: colors.info,    icon: '🔧' },
          { label: 'Prêtes à\nlivrer',         value: readyOrders,         color: colors.success, icon: '📦' },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={[styles.statValue, { color: s.color }]}>{loading ? '—' : s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Nouvelles commandes à traiter */}
      {!loading && newOrders.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🆕 Nouvelles commandes</Text>
            <Pressable onPress={() => router.push('/(pharmacy)/orders' as never)}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </Pressable>
          </View>
          {newOrders.slice(0, 3).map((o) => (
            <Pressable
              key={o.id}
              style={[styles.rxCard, styles.orderCard]}
              onPress={() => router.push('/(pharmacy)/orders' as never)}
            >
              <View style={[styles.rxIconBox, { backgroundColor: colors.warningSurface }]}>
                <Text style={{ fontSize: 22 }}>💊</Text>
              </View>
              <View style={styles.rxBody}>
                <Text style={styles.rxPatient}>{o.patientName}</Text>
                <Text style={styles.rxDate}>{formatDate(o.createdAt)} — {o.totalFcfa.toLocaleString('fr-FR')} FCFA</Text>
              </View>
              <View style={[styles.urgentBadge, { backgroundColor: colors.errorSurface }]}>
                <Text style={[styles.urgentText, { color: colors.error }]}>À traiter</Text>
              </View>
            </Pressable>
          ))}
        </>
      )}

      {/* Dernières ordonnances */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dernières ordonnances</Text>
        <Pressable onPress={() => router.push('/(pharmacy)/prescriptions' as never)}>
          <Text style={styles.seeAll}>Voir tout</Text>
        </Pressable>
      </View>

      {inbox.length === 0 && !loading ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Aucune ordonnance en attente</Text>
        </View>
      ) : (
        inbox.slice(0, 3).map((rx) => (
          <Pressable
            key={rx.id}
            style={styles.rxCard}
            onPress={() => router.push(`/(pharmacy)/prescriptions/${rx.id}` as never)}
          >
            <View style={styles.rxIconBox}>
              <Text style={{ fontSize: 22 }}>📄</Text>
            </View>
            <View style={styles.rxBody}>
              <Text style={styles.rxPatient}>{rx.patientName}</Text>
              <Text style={styles.rxDate}>{formatDate(rx.createdAt)}</Text>
            </View>
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>À valider</Text>
            </View>
          </Pressable>
        ))
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
  headerRight: {},
  avatarCircle: {
    width: 40, height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...typography.label, color: colors.textOnDark, fontSize: 14 },

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

  dutyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadows.card,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  dutyTitle: { ...typography.bodyMedium, color: colors.text },
  dutySub:   { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  bizRow: { flexDirection: 'row', gap: spacing.sm },
  bizCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.card,
  },
  bizValue: { ...typography.bodyMedium, color: colors.primary, textAlign: 'center' },

  shortcutRow: { flexDirection: 'row', gap: spacing.sm },
  shortcut: {
    flex: 1,
    backgroundColor: colors.primarySurface,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  shortcutIcon: { fontSize: 22 },
  shortcutTxt:  { ...typography.small, color: colors.primary, fontWeight: '600' },

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

  rxCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  orderCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  rxIconBox: {
    width: 48, height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  rxBody:    { flex: 1, gap: spacing.xs },
  rxPatient: { ...typography.bodyMedium, color: colors.text },
  rxDate:    { ...typography.caption, color: colors.textSecondary },
  urgentBadge: {
    backgroundColor: colors.warningSurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
  },
  urgentText: { ...typography.label, color: colors.warning },

  emptyBox:  { alignItems: 'center', padding: spacing.lg },
  emptyText: { ...typography.caption, color: colors.textSecondary },
});
