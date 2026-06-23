# Standards de code — MBOLO Santé

## TypeScript

```ts
// ✅ Strict mode activé — pas de `any` non justifié
// ✅ Retours de fonctions explicites pour les fonctions publiques
// ✅ `const` par défaut, `let` seulement si réassignation nécessaire
// ❌ Pas de `as any`, `as unknown as X` seulement si inévitable et commenté
```

```ts
// ✅ Inférence Zod pour les types d'input
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

// ❌ Ne pas redéfinir manuellement ce que Zod peut inférer
```

## Nommage

| Élément | Convention | Exemple |
|---|---|---|
| Fichiers | `kebab-case.ts` | `order-items.ts` |
| Classes | `PascalCase` | `OrderService` |
| Interfaces | `PascalCase` | `PaymentProvider` |
| Enums (TS) | `PascalCase` | `OrderStatus.DELIVERED` |
| Fonctions/variables | `camelCase` | `createOrder`, `totalFcfa` |
| Constantes globales | `SCREAMING_SNAKE` | `MAX_OTP_ATTEMPTS` |
| Composants RN | `PascalCase.tsx` | `OrderCard.tsx` |
| Hooks | `useCamelCase.ts` | `useOrders.ts` |
| Stores Zustand | `useCamelCaseStore.ts` | `useOrderStore.ts` |

## API — Conventions

### Handlers de route

```ts
// ✅ Toujours asyncHandler — jamais de try/catch dans le router
router.post('/', requireAuth, validate(Schema), asyncHandler(async (req, res) => {
  res.status(201).json(await service.create(req.user!.userId, req.body));
}));

// ❌ Pas de try/catch dans les routers — laisser errorHandler central gérer
```

### Services

```ts
// ✅ Lever des AppError typées avec HTTP.xxx()
if (!order) throw HTTP.notFound('Commande introuvable');
if (order.patientId !== userId) throw HTTP.forbidden();

// ✅ Transactions Prisma pour les opérations multi-tables atomiques
await prisma.$transaction(async (tx) => { ... });
```

### Repositories

```ts
// ✅ Un repository = une table principale
// ✅ Retourner les objets Prisma tels quels (pas de mapping dans le repo)
// ❌ Pas de logique conditionnelle dans les repos — ça appartient au service
```

## Monétaire

```ts
// ✅ Toujours en FCFA entier (Int en Prisma)
const totalFcfa = items.reduce((s, i) => s + i.quantity * i.unitPriceFcfa, 0);

// ❌ Jamais de flottants pour les montants
// ❌ Jamais de prix en dur dans le code — toujours depuis la table pricing
```

## Notifications

```ts
// ✅ Via notificationService du container — jamais d'appel direct au provider
await notificationService.send({ to: user.phone, message: '...' });

// ✅ Messages en français, concis, sans jargon technique
// ❌ Pas d'ID complets dans les messages — utiliser les 6 derniers caractères
`Commande #${orderId.slice(-6).toUpperCase()}`
```

## Mobile (React Native)

```tsx
// ✅ Fonctions fléchées pour les composants
const OrderCard = ({ order }: OrderCardProps) => { ... };

// ✅ Styles via StyleSheet.create() ou theme tokens — jamais de valeurs en dur
const styles = StyleSheet.create({
  container: { padding: spacing.md, backgroundColor: colors.surface },
});

// ✅ Logique async dans les hooks — jamais dans les composants directement
const { orders, isLoading, error } = useOrders();

// ❌ Pas de console.log — utiliser console.warn pour dev, supprimer avant PR
```

## Git

```
feat: description courte de la fonctionnalité
fix: description du bug corrigé
chore: tâche technique (deps, config, build)
refactor: refactorisation sans changement fonctionnel
```

- Un commit = une intention
- Branche : `feat/nom-feature` ou `fix/nom-bug`
- Squash avant merge si > 5 commits de WIP

## Ce qu'on ne fait pas

- Pas de `console.log` en production
- Pas de secrets dans le code (utiliser `.env`)
- Pas de logique métier dans les routers ou repositories
- Pas de prix en dur (toujours table `pricing`)
- Pas de provider appelé directement (toujours via `container.ts`)
- Pas de champ `any` dans les schemas Zod
- Pas de relation polymorphe via Prisma (utiliser `refTable`/`refId` string + query app-level)
