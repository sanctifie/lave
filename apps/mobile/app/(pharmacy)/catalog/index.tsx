import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { catalogService, Product } from '../../../src/services/catalog.service';
import { BarcodeScanner } from '../../../src/components/BarcodeScanner';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

function fcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }

export default function CatalogScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState('');

  // Formulaire d'ajout
  const [name, setName]       = useState('');
  const [price, setPrice]     = useState('');
  const [barcode, setBarcode] = useState('');
  const [isAdvice, setIsAdvice] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      setProducts(await catalogService.list({ q: q || undefined }));
    } catch {
      Alert.alert('Erreur', 'Impossible de charger le catalogue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onScanned = async (code: string) => {
    setScanOpen(false);
    setBarcode(code);
    // Si le code-barres existe déjà, on prévient (évite les doublons).
    const existing = await catalogService.byBarcode(code);
    if (existing) {
      Alert.alert('Déjà au catalogue', `${existing.name} — ${fcfa(existing.priceFcfa)}`);
    }
  };

  const add = async () => {
    const p = parseInt(price, 10);
    if (!name.trim() || !p || p <= 0) {
      Alert.alert('', 'Indiquez au moins un nom et un prix valides.');
      return;
    }
    setSaving(true);
    try {
      await catalogService.create({
        name: name.trim(),
        priceFcfa: p,
        barcode: barcode.trim() || null,
        isAdvice,
        sensitive,
      });
      setName(''); setPrice(''); setBarcode(''); setIsAdvice(false); setSensitive(false);
      await load(query);
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Ajout impossible.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (prod: Product) => {
    Alert.alert('Supprimer', `Retirer « ${prod.name} » du catalogue ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await catalogService.remove(prod.id); await load(query); } },
    ]);
  };

  const toggleStock = async (prod: Product) => {
    await catalogService.update(prod.id, { inStock: !prod.inStock });
    await load(query);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Catalogue</Text>
          <Text style={styles.sub}>{products.length} produit(s) · poste de dispensation</Text>
        </View>

        {/* Ajout rapide */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ajouter un produit</Text>
          <TextInput style={styles.input} placeholder="Nom du produit" placeholderTextColor={colors.textDisabled} value={name} onChangeText={setName} />
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Prix (FCFA)" placeholderTextColor={colors.textDisabled} keyboardType="number-pad" value={price} onChangeText={setPrice} />
          </View>
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Code-barres (optionnel)" placeholderTextColor={colors.textDisabled} value={barcode} onChangeText={setBarcode} />
            <Pressable style={styles.scanBtn} onPress={() => setScanOpen(true)}>
              <Text style={styles.scanTxt}>📷 Scanner</Text>
            </Pressable>
          </View>
          <Pressable style={styles.adviceToggle} onPress={() => setIsAdvice((v) => !v)}>
            <View style={[styles.checkbox, isAdvice && styles.checkboxOn]}>{isAdvice && <Text style={styles.check}>✓</Text>}</View>
            <Text style={styles.adviceTxt}>Produit conseil (OTC) — proposable en complément</Text>
          </Pressable>
          <Pressable style={styles.adviceToggle} onPress={() => setSensitive((v) => !v)}>
            <View style={[styles.checkbox, sensitive && styles.checkboxWarn]}>{sensitive && <Text style={styles.check}>✓</Text>}</View>
            <Text style={styles.adviceTxt}>Sensible — antibiotique / détournable (original requis à la dispensation)</Text>
          </Pressable>
          <Pressable style={[styles.addBtn, saving && { opacity: 0.6 }]} disabled={saving} onPress={add}>
            <Text style={styles.addTxt}>{saving ? 'Ajout…' : 'Ajouter au catalogue'}</Text>
          </Pressable>
        </View>

        {/* Recherche */}
        <TextInput
          style={styles.search}
          placeholder="Rechercher (nom ou code-barres)…"
          placeholderTextColor={colors.textDisabled}
          value={query}
          onChangeText={(v) => { setQuery(v); load(v); }}
        />

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : products.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyIcon}>📦</Text><Text style={styles.emptyTxt}>Aucun produit. Ajoutez vos références pour accélérer la dispensation.</Text></View>
        ) : (
          products.map((p) => (
            <View key={p.id} style={styles.prod}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prodName}>
                  {p.name}
                  {p.isAdvice ? '  💡' : ''}{p.sensitive ? '  🔒' : ''}
                </Text>
                <Text style={styles.prodMeta}>
                  {fcfa(p.priceFcfa)}{p.barcode ? ` · ${p.barcode}` : ''}
                </Text>
              </View>
              <Pressable onPress={() => toggleStock(p)} style={[styles.stockChip, !p.inStock && styles.stockOut]}>
                <Text style={[styles.stockTxt, !p.inStock && styles.stockOutTxt]}>{p.inStock ? 'En stock' : 'Rupture'}</Text>
              </Pressable>
              <Pressable onPress={() => remove(p)} style={styles.delBtn}><Text style={styles.delTxt}>✕</Text></Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <BarcodeScanner visible={scanOpen} onClose={() => setScanOpen(false)} onScanned={onScanned} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  header:  { paddingTop: spacing.xl },
  title:   { ...typography.h2, color: colors.text },
  sub:     { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm, ...shadows.card },
  cardTitle: { ...typography.bodyMedium, color: colors.text },
  row: { flexDirection: 'row', gap: spacing.sm },
  input: {
    ...typography.body, color: colors.text,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface,
  },
  scanBtn: { justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.primary },
  scanTxt: { ...typography.label, color: colors.primary },
  adviceToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  checkbox: { width: 20, height: 20, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkboxWarn: { backgroundColor: colors.warning, borderColor: colors.warning },
  check: { ...typography.label, color: colors.textOnDark },
  adviceTxt: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  addBtn: { backgroundColor: colors.primary, borderRadius: radii.full, paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.xs },
  addTxt: { ...typography.bodyMedium, color: colors.textOnDark },

  search: {
    ...typography.body, color: colors.text,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface,
  },

  empty: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 32 },
  emptyTxt: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  prod: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, ...shadows.card },
  prodName: { ...typography.bodyMedium, color: colors.text },
  prodMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  stockChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.full, backgroundColor: colors.successSurface },
  stockOut: { backgroundColor: colors.errorSurface },
  stockTxt: { ...typography.small, color: colors.success },
  stockOutTxt: { color: colors.error },
  delBtn: { paddingHorizontal: spacing.xs },
  delTxt: { ...typography.bodyMedium, color: colors.error },
});
