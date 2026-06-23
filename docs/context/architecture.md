# Architecture — MBOLO Santé

## Vue d'ensemble

```
┌─────────────────────────────────────────────────┐
│              apps/mobile (RN + Expo)            │
│  screens → hooks → services → @mbolo/shared     │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS REST
┌──────────────────▼──────────────────────────────┐
│              apps/api (Express + TS)            │
│                                                 │
│  router → service → repository → Prisma         │
│                ↕                                │
│          infrastructure/                        │
│    prisma │ redis │ providers                   │
│           │       │  ├── PaymentProvider        │
│           │       │  ├── NotificationProvider   │
│           │       │  └── VideoProvider          │
└──────────────────┬──────────────────────────────┘
         ┌─────────┴─────────┐
    PostgreSQL            Redis
  (données permanentes)  (OTP, sessions,
                          file d'attente médecins)
```

## Monorepo (Turborepo + pnpm)

| Package | Rôle |
|---|---|
| `apps/api` | API REST — seul processus avec accès DB |
| `apps/mobile` | Application React Native — zéro accès DB direct |
| `packages/shared` | Enums, types, schemas Zod — importés des deux côtés |
| `packages/config` | ESLint, Prettier, TSConfig partagés |

## Pattern par domaine (API)

Chaque domaine dans `apps/api/src/domains/` suit la même structure :

```
{domain}/
  router.ts       ← Routes Express, validation, auth guards
  service.ts      ← Logique métier pure, orchestration
  repository.ts   ← Requêtes Prisma uniquement, pas de logique
  schema.ts       ← Schemas Zod (validation entrées)
```

**Règle d'or :** un `router` ne contient pas de logique métier. Un `repository` ne contient pas de logique métier. La logique vit dans le `service`.

## Providers (interfaces abstraites)

Les providers externes sont des interfaces dans `infrastructure/providers/`. Les implémentations concrètes sont injectées via `infrastructure/container.ts`.

```
Swap MeSomb → Campay = modifier container.ts uniquement
Swap Africa's Talking → Twilio = modifier container.ts uniquement
```

## Flux de données — Contrainte légale

```
Patient                Plateforme              Pharmacien
  │                       │                       │
  │── upload ordonnance ──▶│── notif WhatsApp ────▶│
  │                       │                       │── valide Rx
  │                       │◀── validation + prix ──│
  │◀── total à payer ─────│                       │
  │── escrow mobile money ▶│                       │
  │                       │── dispatch courier    │
  │── handover code ──────▶│── release escrow ────▶│ (payout)
```

Le pharmacien reste le **seul vendeur légal**. MBOLO ne touche jamais aux prix des médicaments — uniquement aux frais de service et de livraison.

## Téléconsultation — Extension du flow

```
Patient ──── appointment ────▶ Médecin (Daily.co room)
                │
                └── prescription numérique (source: teleconsultation)
                        │
                        └── flow médicaments standard (pharmacist_validation obligatoire)
```

## Environnements

| ENV | DB | Redis | Providers |
|---|---|---|---|
| `development` | docker-compose local | docker-compose local | Stubs (logs console) |
| `staging` | PostgreSQL managé | Redis Cloud | Stubs ou sandbox providers |
| `production` | PostgreSQL managé | Redis Cloud | MeSomb + Africa's Talking + Daily.co |
