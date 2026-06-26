# MBOLO Santé — Design System (Mobile)

> Référence unique pour l'UI React Native. Toute valeur non définie ici doit être discutée avant d'être ajoutée.

---

## 1. Philosophie

| Principe | Application |
|---|---|
| **Confiance d'abord** | Couleurs médicales calmes, pas de jargon, feedback immédiat |
| **Adapté au terrain** | Lisible en plein soleil, opérable à une main, tolérant la latence réseau |
| **Inclusif** | Textes en français simple, icônes + labels (jamais icône seule) |
| **Minimaliste** | Une action principale par écran, zéro déco superflue |

---

## 2. Palette de couleurs

```ts
// apps/mobile/src/theme/colors.ts
export const colors = {
  // ── Primaire (teal médical — confiance, calme) ──────────────
  primary:        '#006D77',
  primaryLight:   '#83C5BE',
  primarySurface: '#EDF6F9',

  // ── Accent (corail chaud — chaleur, accessibilité) ──────────
  accent:         '#E29578',
  accentLight:    '#FFDDD2',

  // ── Neutres ─────────────────────────────────────────────────
  background:     '#F4F7F8',
  surface:        '#FFFFFF',
  border:         '#E2E8F0',
  borderFocus:    '#006D77',

  // ── Texte ───────────────────────────────────────────────────
  text:           '#1A1A2E',
  textSecondary:  '#64748B',
  textDisabled:   '#94A3B8',
  textOnDark:     '#FFFFFF',

  // ── États sémantiques ────────────────────────────────────────
  success:        '#059669',
  successSurface: '#D1FAE5',
  warning:        '#D97706',
  warningSurface: '#FEF3C7',
  error:          '#DC2626',
  errorSurface:   '#FEE2E2',
  info:           '#0284C7',
  infoSurface:    '#E0F2FE',

  // ── Overlay ─────────────────────────────────────────────────
  overlay:        'rgba(26, 26, 46, 0.5)',
} as const;
```

**Règle d'or :** `primary` sur `surface`/`background` uniquement. Ne jamais mettre `primary` sur `accent`.

---

## 3. Typographie

Polices système — pas de chargement réseau, rendu natif optimal.

```ts
// apps/mobile/src/theme/typography.ts
export const typography = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h3: { fontSize: 18, fontWeight: '600', lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMedium: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  label: { fontSize: 12, fontWeight: '600', lineHeight: 16, letterSpacing: 0.5 },
} as const;
```

**Règles :**
- Longueur de ligne max : 75 caractères (éviter les lignes trop longues sur grand écran)
- Jamais moins de `caption` (14px) pour du texte fonctionnel
- `label` uniquement pour badges et étiquettes de champ

---

## 4. Espacement

Base unitaire : **4 px**.

```ts
export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;
```

**Règles de layout :**
- Padding horizontal des écrans : `spacing.md` (16px)
- Gap entre sections : `spacing.lg` (24px)
- Gap entre éléments d'une liste : `spacing.sm` (8px)

---

## 5. Rayons et ombres

```ts
export const radii = {
  sm:   4,
  md:   8,
  lg:   16,
  xl:   24,
  full: 9999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  modal: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;
```

---

## 6. Composants — Conventions

### Button

| Variante | Usage |
|---|---|
| `primary` | Action principale de l'écran (1 par écran max) |
| `secondary` | Action secondaire (outline) |
| `ghost` | Action tertiaire (texte seul) |
| `danger` | Annulation ou suppression |

```tsx
// Anatomie d'un bouton
<Button
  variant="primary"
  label="Confirmer la commande"   // toujours un label texte
  icon="check"                    // optionnel, toujours accompagné du label
  loading={isSubmitting}          // affiche ActivityIndicator
  onPress={handleSubmit}
/>
```

**Taille minimale tapable : 48×48 dp** (règle WCAG + Android).

### Card

```tsx
<Card>
  <Card.Header title="Commande #A3F9" badge={{ label: 'En livraison', color: 'info' }} />
  <Card.Body>{/* contenu */}</Card.Body>
  <Card.Footer action={{ label: 'Voir détail', onPress: ... }} />
</Card>
```

### StatusBadge

Mappe directement sur les enums `@mbolo/shared` :

```tsx
<StatusBadge status={order.status} />
// Affiche automatiquement couleur + label FR selon OrderStatus
```

Labels en français pour chaque statut (voir `apps/mobile/src/theme/statusLabels.ts`).

### Input

```tsx
<Input
  label="Numéro WhatsApp"
  placeholder="+241 XX XX XX XX"
  keyboardType="phone-pad"
  error={errors.phone?.message}   // message Zod traduit
  hint="Utilisé pour les notifications de livraison"
/>
```

**Toujours** : label visible + message d'erreur inline + hint si nécessaire. Jamais de placeholder seul comme label.

---

## 7. Navigation (Expo Router)

```
app/
  (auth)/
    login.tsx           ← téléphone + OTP
  (patient)/
    _layout.tsx         ← tab navigator patient
    index.tsx           ← tableau de bord
    prescriptions/
      index.tsx
      upload.tsx
      [id].tsx
    orders/
      index.tsx
      [id].tsx
    appointments/
      index.tsx
      new.tsx
  (pharmacy)/
    _layout.tsx         ← tab navigator pharmacien
    inbox.tsx
    [prescriptionId]/validate.tsx
    orders/index.tsx
  (courier)/
    _layout.tsx
    deliveries/
      index.tsx
      [id]/tracking.tsx
  (doctor)/
    _layout.tsx
    appointments/index.tsx
    consultation/[id].tsx
```

**Règles :**
- Les groupes `(auth)`, `(patient)`, etc. isolent les layouts par rôle
- Redirection automatique post-login selon `user.role`
- Jamais de navigation programmatique depuis un service — uniquement depuis les écrans/hooks

---

## 8. États d'interface

Chaque écran qui charge des données doit gérer ces 4 états :

| État | Composant |
|---|---|
| Chargement initial | `<ScreenSkeleton />` (pas de spinner générique) |
| Erreur réseau | `<ErrorState onRetry={refetch} />` |
| Liste vide | `<EmptyState icon="..." message="..." action={...} />` |
| Succès | Contenu normal |

---

## 9. Gestion des formulaires

- Validation : **React Hook Form + Zod** (schemas importés depuis `@mbolo/shared`)
- Soumission : désactiver le bouton + afficher `loading` pendant la requête
- Erreurs serveur : afficher via `toast` (non bloquant) sauf erreurs de validation champs

---

## 10. Internationalisation

MVP en **français uniquement**. Préparer l'architecture i18n dès le départ :

```ts
// apps/mobile/src/i18n/fr.ts — source unique des chaînes
export const fr = {
  prescription: {
    upload: 'Envoyer une ordonnance',
    pending: 'En attente de validation',
    validated: 'Validée par le pharmacien',
  },
  // ...
};
```

Jamais de chaînes en dur dans les composants.

---

## 11. Accessibilité (minimum requis)

- `accessibilityLabel` sur tous les `Pressable`/`TouchableOpacity` sans texte enfant
- Contraste minimum 4.5:1 pour le texte normal (`text` sur `background` = 7.8:1 ✓)
- `accessibilityRole` sur les boutons et champs
- Support du mode sombre : prévu mais pas priorisé MVP (utiliser `useColorScheme` pour le préparer)
