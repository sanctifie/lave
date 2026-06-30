import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ridesService, RideEstimate } from '../../../src/services/rides.service';
import { locationService, LIBREVILLE, Coords } from '../../../src/services/location.service';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

const RIDE_TYPES = [
  { value: 'home',     label: 'Domicile',  emoji: '🏠', desc: 'Retour ou aller au domicile' },
  { value: 'hospital', label: 'Hôpital',   emoji: '🏥', desc: 'Transport vers l\'hôpital' },
  { value: 'exam',     label: 'Examen',    emoji: '🔬', desc: 'Transport pour un examen médical' },
] as const;

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }

export default function NewRideScreen() {
  const router = useRouter();
  const [type, setType] = useState<'home' | 'hospital' | 'exam'>('hospital');
  const [originLandmark, setOriginLandmark] = useState('');
  const [destLandmark, setDestLandmark]     = useState('');
  const [notes, setNotes]                   = useState('');
  const [loading, setLoading]               = useState(false);
  const [errors, setErrors]                 = useState<Record<string, string>>({});

  // Géolocalisation + estimation
  const [locating, setLocating]     = useState(true);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate]     = useState<RideEstimate | null>(null);
  const originCoordsRef = useRef<Coords>(LIBREVILLE);
  const destCoordsRef   = useRef<Coords | null>(null);
  const gpsOriginRef    = useRef<Coords | null>(null);

  // Récupère la position GPS au montage et préremplit le point de départ.
  useEffect(() => {
    (async () => {
      const coords = await locationService.getCurrentCoords();
      const resolved = coords ?? LIBREVILLE;
      gpsOriginRef.current  = resolved;
      originCoordsRef.current = resolved;
      if (coords) {
        const label = await locationService.reverseGeocode(coords);
        if (label) setOriginLandmark((prev) => prev || label);
      }
      setLocating(false);
    })();
  }, []);

  // Estimation tarifaire en direct (débattue) dès qu'une destination est saisie.
  useEffect(() => {
    if (destLandmark.trim().length < 3) { setEstimate(null); return; }
    const timer = setTimeout(async () => {
      setEstimating(true);
      try {
        const oc = (originLandmark.trim().length >= 3
          ? await locationService.geocode(originLandmark.trim())
          : null) ?? gpsOriginRef.current ?? LIBREVILLE;
        const dc = await locationService.geocode(destLandmark.trim());
        originCoordsRef.current = oc;
        destCoordsRef.current   = dc;
        if (dc) {
          const est = await ridesService.estimate({
            originLat: oc.lat, originLng: oc.lng, destLat: dc.lat, destLng: dc.lng,
          });
          setEstimate(est);
        } else {
          setEstimate(null);
        }
      } catch {
        setEstimate(null);
      } finally {
        setEstimating(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [originLandmark, destLandmark]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (originLandmark.trim().length < 3) e.origin = 'Adresse de départ requise (min 3 caractères)';
    if (destLandmark.trim().length < 3) e.dest = 'Adresse d\'arrivée requise (min 3 caractères)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Résout les coordonnées définitives (géocodage à la volée si nécessaire).
      const oc = originCoordsRef.current
        ?? (await locationService.geocode(originLandmark.trim()))
        ?? gpsOriginRef.current ?? LIBREVILLE;
      const dc = destCoordsRef.current
        ?? (await locationService.geocode(destLandmark.trim()))
        ?? oc;

      await ridesService.request({
        type,
        originLat: oc.lat,
        originLng: oc.lng,
        originLandmark: originLandmark.trim(),
        destLat: dc.lat,
        destLng: dc.lng,
        destLandmark: destLandmark.trim(),
        notes: notes.trim() || undefined,
      });
      Alert.alert('Course demandée', 'Un chauffeur va prendre en charge votre demande.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'enregistrer la course. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Retour</Text>
        </Pressable>
        <Text style={styles.title}>Nouveau transport</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Type de transport */}
        <Text style={styles.sectionLabel}>Type de transport</Text>
        <View style={styles.typeRow}>
          {RIDE_TYPES.map((t) => (
            <Pressable
              key={t.value}
              style={[styles.typeCard, type === t.value && styles.typeCardActive]}
              onPress={() => setType(t.value)}
            >
              <Text style={styles.typeEmoji}>{t.emoji}</Text>
              <Text style={[styles.typeLabel, type === t.value && styles.typeLabelActive]}>
                {t.label}
              </Text>
              <Text style={styles.typeDesc}>{t.desc}</Text>
            </Pressable>
          ))}
        </View>

        {/* Adresses */}
        <View style={styles.form}>
          <Input
            label="Point de départ"
            placeholder={locating ? 'Localisation en cours…' : 'Ex : Hôpital Owendo, Libreville'}
            value={originLandmark}
            onChangeText={setOriginLandmark}
            error={errors.origin}
            autoCapitalize="words"
          />
          {locating && (
            <View style={styles.locatingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.locatingText}>Récupération de votre position…</Text>
            </View>
          )}
          <Input
            label="Destination"
            placeholder="Ex : Domicile, Quartier Louis"
            value={destLandmark}
            onChangeText={setDestLandmark}
            error={errors.dest}
            autoCapitalize="words"
          />
          <Input
            label="Notes (optionnel)"
            placeholder="Informations supplémentaires pour le chauffeur"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ height: 80, paddingTop: spacing.sm }}
          />
        </View>

        {/* Estimation tarifaire en direct */}
        {estimating ? (
          <View style={styles.estimateBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.estimatingText}>Calcul du tarif…</Text>
          </View>
        ) : estimate ? (
          <View style={styles.estimateCard}>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Distance estimée</Text>
              <Text style={styles.estimateValue}>{estimate.distanceKm.toFixed(1)} km</Text>
            </View>
            <View style={styles.estimateDivider} />
            <View style={styles.estimateRow}>
              <Text style={styles.estimateFareLabel}>Tarif estimé</Text>
              <Text style={styles.estimateFare}>{formatFcfa(estimate.fareEstFcfa)}</Text>
            </View>
            <Text style={styles.estimateHint}>
              Base {formatFcfa(estimate.baseFee)} + {formatFcfa(estimate.perKm)}/km · tarif final confirmé en fin de course
            </Text>
          </View>
        ) : (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Saisissez votre destination pour obtenir une estimation de tarif instantanée.
            </Text>
          </View>
        )}

        <Button label="Demander le transport" loading={loading} onPress={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
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
    gap: spacing.xs,
  },
  backBtn:  {},
  backText: { ...typography.body, color: colors.primary },
  title:    { ...typography.h3, color: colors.text },

  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },

  sectionLabel: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase' },

  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.card,
  },
  typeCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  typeEmoji:      { fontSize: 28 },
  typeLabel:      { ...typography.label, color: colors.textSecondary, textAlign: 'center' },
  typeLabelActive:{ color: colors.primary },
  typeDesc:       { ...typography.small, color: colors.textDisabled, textAlign: 'center' },

  form: { gap: spacing.md },

  locatingRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: -spacing.sm },
  locatingText: { ...typography.caption, color: colors.textSecondary },

  estimateBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md,
    ...shadows.card,
  },
  estimatingText: { ...typography.body, color: colors.textSecondary },

  estimateCard: {
    backgroundColor: colors.primarySurface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
  },
  estimateRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  estimateLabel: { ...typography.body, color: colors.textSecondary },
  estimateValue: { ...typography.bodyMedium, color: colors.text },
  estimateDivider: { height: 1, backgroundColor: colors.primaryLight, opacity: 0.5 },
  estimateFareLabel: { ...typography.bodyMedium, color: colors.text },
  estimateFare:  { ...typography.h2, color: colors.primary },
  estimateHint:  { ...typography.small, color: colors.textSecondary },

  infoBox: {
    backgroundColor: '#E0F2FE',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  infoText: { ...typography.caption, color: '#0369A1' },
});
