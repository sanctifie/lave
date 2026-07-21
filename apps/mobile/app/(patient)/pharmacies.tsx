import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { partnersService, distanceKm, PharmacyDirItem } from '../../src/services/partners.service';
import { locationService, Coords } from '../../src/services/location.service';
import { colors, spacing, radii, typography, shadows } from '../../src/theme';

interface Row extends PharmacyDirItem {
  distanceKm: number | null;
}

export default function PharmaciesScreen() {
  const router = useRouter();

  const [items, setItems]       = useState<PharmacyDirItem[]>([]);
  const [coords, setCoords]     = useState<Coords | null>(null);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState('');
  const [dutyOnly, setDutyOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, pos] = await Promise.all([
        partnersService.listPharmacies(),
        locationService.getCurrentCoords(),
      ]);
      setItems(list);
      setCoords(pos);
    } catch {
      /* liste vide en cas d'erreur */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const withDist: Row[] = items.map((p) => ({
      ...p,
      distanceKm:
        coords && p.lat != null && p.lng != null
          ? distanceKm(coords, { lat: p.lat, lng: p.lng })
          : null,
    }));
    const filtered = withDist.filter((p) => {
      if (dutyOnly && !p.isOnDuty) return false;
      if (q && !p.legalName.toLowerCase().includes(q) && !p.landmark.toLowerCase().includes(q)) return false;
      return true;
    });
    // Garde d'abord, puis distance croissante (les sans-distance en dernier).
    return filtered.sort((a, b) => {
      if (a.isOnDuty !== b.isOnDuty) return a.isOnDuty ? -1 : 1;
      const da = a.distanceKm ?? Infinity;
      const db = b.distanceKm ?? Infinity;
      return da - db;
    });
  }, [items, coords, query, dutyOnly]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable>
        <Text style={styles.pageTitle}>Pharmacies</Text>
        <View style={{ width: 56 }} />
      </View>

      <TextInput
        style={styles.search}
        placeholder="Rechercher une pharmacie ou un quartier"
        placeholderTextColor={colors.textDisabled}
        value={query}
        onChangeText={setQuery}
      />

      <Pressable style={styles.dutyToggle} onPress={() => setDutyOnly((v) => !v)}>
        <View style={[styles.checkbox, dutyOnly && styles.checkboxOn]}>
          {dutyOnly && <Text style={styles.checkboxTick}>✓</Text>}
        </View>
        <Text style={styles.dutyToggleTxt}>🌙 De garde uniquement</Text>
      </Pressable>

      {!coords && !loading && (
        <Text style={styles.geoHint}>Activez la localisation pour trier par distance.</Text>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : rows.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTxt}>Aucune pharmacie ne correspond.</Text>
        </View>
      ) : (
        rows.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.name}>{p.legalName}</Text>
              {p.isOnDuty && (
                <View style={styles.dutyBadge}><Text style={styles.dutyBadgeTxt}>🌙 De garde</Text></View>
              )}
            </View>
            <Text style={styles.landmark}>
              {p.landmark}
              {p.distanceKm != null ? ` · ${p.distanceKm < 1 ? `${Math.round(p.distanceKm * 1000)} m` : `${p.distanceKm.toFixed(1)} km`}` : ''}
            </Text>
            <View style={styles.metaRow}>
              {p.rating != null ? (
                <Text style={styles.rating}>⭐ {p.rating.toFixed(1)} ({p.reviewCount})</Text>
              ) : (
                <Text style={styles.noRating}>Pas encore d'avis</Text>
              )}
              {p.openingHours ? <Text style={styles.hours}>🕒 {p.openingHours}</Text> : null}
            </View>
            <View style={styles.actions}>
              {p.phone ? (
                <Pressable style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${p.phone}`)}>
                  <Text style={styles.actionTxt}>📞 Appeler</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.actionBtn, styles.actionPrimary]}
                onPress={() => router.push('/(patient)/prescriptions/upload' as never)}
              >
                <Text style={[styles.actionTxt, styles.actionPrimaryTxt]}>Envoyer une ordonnance</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: spacing.xl,
  },
  back:      { ...typography.bodyMedium, color: colors.primary },
  pageTitle: { ...typography.h3, color: colors.text },

  search: {
    ...typography.body, color: colors.text,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface,
  },
  dutyToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: {
    width: 22, height: 22, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn:   { borderColor: colors.primary, backgroundColor: colors.primary },
  checkboxTick: { color: colors.textOnDark, fontSize: 13, fontWeight: '700' },
  dutyToggleTxt: { ...typography.body, color: colors.text },
  geoHint: { ...typography.caption, color: colors.textSecondary },

  emptyBox: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 32 },
  emptyTxt:  { ...typography.body, color: colors.textSecondary },

  card: {
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md,
    gap: spacing.xs, ...shadows.card,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name:     { ...typography.bodyMedium, color: colors.text, flex: 1 },
  dutyBadge: { backgroundColor: colors.primarySurface, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  dutyBadgeTxt: { ...typography.small, color: colors.primary, fontWeight: '600' },
  landmark: { ...typography.caption, color: colors.textSecondary },
  metaRow:  { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  rating:   { ...typography.caption, color: colors.warning },
  noRating: { ...typography.small, color: colors.textDisabled },
  hours:    { ...typography.caption, color: colors.textSecondary },

  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  actionTxt: { ...typography.label, color: colors.textSecondary },
  actionPrimary: { borderColor: colors.primary, backgroundColor: colors.primary },
  actionPrimaryTxt: { color: colors.textOnDark },
});
