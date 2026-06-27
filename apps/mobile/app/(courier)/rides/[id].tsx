import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ridesService, Ride } from '../../../src/services/rides.service';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

const STATUS_LABEL: Record<string, string> = {
  pending:   'En attente',
  assigned:  'Assigné',
  en_route:  'En route',
  arrived:   'Arrivé',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

const NEXT_STATUS: Record<string, { status: string; label: string; color: string }> = {
  assigned:  { status: 'en_route',  label: '🚗 Démarrer la course',    color: colors.primary },
  en_route:  { status: 'arrived',   label: '📍 Je suis arrivé',         color: '#0891B2' },
  arrived:   { status: 'completed', label: '✅ Terminer la course',     color: colors.success },
};

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }

export default function CourierRideDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const [ride, setRide]   = useState<Ride | null>(null);
  const [loading, setLoading]     = useState(true);
  const [updating, setUpdating]   = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await (await import('../../../src/services/client')).apiClient.get(`/rides/${id}`);
      setRide(data.data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger la course');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const advance = async () => {
    if (!ride) return;
    const next = NEXT_STATUS[ride.status];
    if (!next) return;

    Alert.alert(
      'Confirmer',
      `Passer la course à : ${STATUS_LABEL[next.status]} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setUpdating(true);
            try {
              await ridesService.updateStatus(id, next.status);
              await load();
            } catch {
              Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!ride) return null;

  const nextAction = NEXT_STATUS[ride.status];
  const isCompleted = ride.status === 'completed';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête statut */}
      <View style={[styles.statusBanner, isCompleted && styles.statusBannerDone]}>
        <Text style={styles.statusEmoji}>
          {isCompleted ? '✅' : '🚗'}
        </Text>
        <Text style={styles.statusText}>{STATUS_LABEL[ride.status] ?? ride.status}</Text>
      </View>

      {/* Carte itinéraire */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Itinéraire</Text>

        <View style={styles.routeRow}>
          <View style={styles.routeDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.routeLabel}>Départ</Text>
            <Text style={styles.routeValue}>{ride.request?.originLandmark ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.routeRow}>
          <View style={[styles.routeDot, styles.routeDotDest]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.routeLabel}>Arrivée</Text>
            <Text style={styles.routeValue}>{ride.request?.destLandmark ?? '—'}</Text>
          </View>
        </View>
      </View>

      {/* Carte tarif */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tarification</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Tarif estimé</Text>
          <Text style={styles.fareValue}>{formatFcfa(ride.fareEstFcfa)}</Text>
        </View>
        {ride.fareFinalFcfa != null && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Tarif final</Text>
            <Text style={styles.fareValue}>{formatFcfa(ride.fareFinalFcfa)}</Text>
          </View>
        )}
      </View>

      {/* Étapes visuelles */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Progression</Text>
        {(['assigned', 'en_route', 'arrived', 'completed'] as const).map((s, i) => {
          const statuses = ['assigned', 'en_route', 'arrived', 'completed'];
          const currentIdx = statuses.indexOf(ride.status);
          const stepIdx    = statuses.indexOf(s);
          const isDone     = stepIdx <= currentIdx;
          return (
            <View key={s} style={styles.stepRow}>
              <View style={[styles.stepDot, isDone && styles.stepDotDone]} />
              <Text style={[styles.stepLabel, isDone && styles.stepLabelDone]}>
                {STATUS_LABEL[s]}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Bouton action */}
      {nextAction && !isCompleted && (
        <Pressable
          style={[styles.actionBtn, { backgroundColor: nextAction.color }, updating && styles.actionBtnDisabled]}
          onPress={advance}
          disabled={updating}
        >
          {updating
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.actionBtnText}>{nextAction.label}</Text>
          }
        </Pressable>
      )}

      {isCompleted && (
        <View style={styles.doneBanner}>
          <Text style={styles.doneText}>Course terminée — merci !</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.md, gap: spacing.md },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statusBanner: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    backgroundColor: colors.primarySurface,
    borderRadius:    radii.lg,
    padding:         spacing.md,
    ...shadows.card,
  },
  statusBannerDone: { backgroundColor: colors.successSurface },
  statusEmoji: { fontSize: 28 },
  statusText:  { ...typography.h3, color: colors.text },

  card: {
    backgroundColor: colors.surface,
    borderRadius:    radii.lg,
    padding:         spacing.md,
    gap:             spacing.sm,
    ...shadows.card,
  },
  sectionTitle: { ...typography.bodyMedium, color: colors.text, marginBottom: spacing.xs },

  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  routeDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.primary, marginTop: 4,
  },
  routeDotDest: { backgroundColor: colors.error },
  routeLine: {
    width: 2, height: 20, backgroundColor: colors.border,
    marginLeft: 5, marginVertical: -spacing.xs,
  },
  routeLabel: { ...typography.caption, color: colors.textSecondary },
  routeValue: { ...typography.body, color: colors.text },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel:  { ...typography.body, color: colors.textSecondary },
  fareValue:  { ...typography.h3, color: colors.primary },

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  stepDotDone: { backgroundColor: colors.success },
  stepLabel:     { ...typography.body, color: colors.textSecondary },
  stepLabelDone: { color: colors.text, fontWeight: '600' },

  actionBtn: {
    borderRadius:  radii.lg,
    padding:       spacing.md,
    alignItems:    'center',
    ...shadows.card,
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText:     { ...typography.bodyMedium, color: '#fff' },

  doneBanner: {
    backgroundColor: colors.successSurface,
    borderRadius:    radii.lg,
    padding:         spacing.md,
    alignItems:      'center',
  },
  doneText: { ...typography.bodyMedium, color: colors.success },
});
