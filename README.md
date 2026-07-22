# MBOLO Santé — Documentation Complète

Plateforme de logistique de soins pour le Gabon — téléconsultation, ordonnances, livraison de médicaments.

---

## Table des matières

1. [Captures d'écran](#captures-décran)
2. [Architecture](#architecture)
3. [Prérequis](#prérequis)
4. [Installation](#installation)
5. [Variables d'environnement](#variables-denvironnement)
6. [Base de données](#base-de-données)
7. [Lancer l'application](#lancer-lapplication)
8. [Build production](#build-production)
9. [Fournisseurs externes](#fournisseurs-externes)
10. [Contrainte légale](#contrainte-légale)

---

## Captures d'écran

**Application mobile** (patient · médecin · pharmacie · coursier) :

![Aperçu mobile — patient & pro](docs/screenshots/mobile/overview.png)
![Aperçu mobile — médecin, coursier, messagerie](docs/screenshots/mobile/overview-2.png)

**Dashboard web (administration)** :

![Tableau de bord admin](docs/screenshots/web/02-dashboard.png)

> Galerie complète (9 pages web + 6 écrans mobiles) : [`docs/screenshots/`](docs/screenshots/README.md)

---

## Architecture

```
mbolo-sante/                  ← Monorepo Turborepo
├── apps/
│   ├── api/                  ← API REST (Express · TypeScript · Prisma · PostgreSQL)
│   ├── mobile/               ← App mobile (React Native · Expo · Expo Router)
│   └── web/                  ← Dashboard admin (Vite · React · React Router)
├── packages/
│   ├── shared/               ← Types, enums, schémas Zod partagés
│   └── config/               ← ESLint · Prettier · TypeScript partagés
├── docker-compose.yml        ← PostgreSQL 16 + Redis 7 en local
└── pnpm-workspace.yaml
```

### Stack technique

| Couche | Technologie |
|--------|-------------|
| API | Express 4 · TypeScript · Zod · JWT |
| ORM | Prisma 5 · PostgreSQL 16 |
| Cache / OTP | Redis 7 |
| Mobile | React Native 0.74 · Expo 51 · Expo Router 3 |
| Dashboard web | Vite 5 · React 18 · React Router 6 |
| État | Zustand · expo-secure-store |
| Tests | Vitest (API) |
| Paiement | MyPVIT (Airtel Money · Moov Money) |
| Push | Expo Notifications |
| Vidéo | Daily.co (auto-activé si `DAILY_API_KEY`, sinon stub) |
| Notifications | WhatsApp Cloud API (prioritaire) · Africa's Talking SMS (repli) |
| Assistance IA | MBOLO Assist — auto-activé si `ANTHROPIC_API_KEY`, sinon stub |

### Domaines fonctionnels (API)

`auth` · `users` · `partners` · `doctors` · `appointments` · `prescriptions`
(circuit officinal : ordonnancier stupéfiants, cachet numérique, collecte de
l'original) · `orders` · `deliveries` (suivi GPS live · COD) · `payments` ·
`pricing` · `rides` · `meals` · `chat` · `reviews` (+ modération IA) ·
`carelinks` (compte accompagnant) · `kyc` (vérification + pré-contrôle vision) ·
`notifications` (centre persistant) · `admin`.

---

## Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Node.js | 20.x |
| pnpm | 9.x |
| Docker + Docker Compose | 24.x |
| Expo CLI | `npx expo` (inclus dans les devDeps) |
| Git | 2.x |

Optionnel (build natif) :
- Android Studio + SDK 34 pour Android
- Xcode 15 + iOS Simulator pour iOS

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/sanctifie/lave.git
cd lave
```

### 2. Installer les dépendances

```bash
pnpm install
```

### 3. Démarrer l'infrastructure locale (PostgreSQL + Redis)

```bash
docker-compose up -d

# Vérifier que les conteneurs tournent
docker-compose ps
```

### 4. Variables d'environnement

```bash
cp apps/api/.env.example apps/api/.env
```

Éditez `apps/api/.env` — voir section [Variables d'environnement](#variables-denvironnement).

### 5. Générer le client Prisma et migrer la base de données

```bash
# Génération du client TypeScript Prisma
pnpm db:generate

# Application des migrations (crée les tables)
pnpm db:migrate
```

### 6. Lancer l'application

```bash
# API + Mobile en parallèle
pnpm dev

# Ou séparément
pnpm dev --filter api
pnpm dev --filter mobile
```

---

## Variables d'environnement

Fichier : `apps/api/.env`

### Base de données et cache

```env
DATABASE_URL="postgresql://mbolo:mbolo_dev@localhost:5432/mbolo_sante"
REDIS_URL="redis://localhost:6379"
```

### Authentification JWT

```env
JWT_SECRET="change-me-in-production-min-32-chars"
JWT_EXPIRES_IN="7d"
OTP_TTL_SECONDS=300
```

### Serveur

```env
PORT=3000
NODE_ENV=development
```

### MyPVIT — Paiement mobile money

> Laisser vide en développement → le stub s'active automatiquement (logs console).

```env
MYPVIT_BASE_URL="https://api.mypvit.pro/v2"
MYPVIT_URL_CODE=""
MYPVIT_OPERATION_ACCOUNT_CODE=""
MYPVIT_API_PASSWORD=""
MYPVIT_CALLBACK_URL_CODE=""
```

URL webhook à déclarer dans le dashboard MyPVIT → URLs → type "Callback" :
```
https://votre-domaine.com/payments/webhook
```

IPs MyPVIT à autoriser côté firewall (callbacks entrants) :
```
176.31.65.18 / 176.31.65.20 / 176.31.65.21 / 13.59.249.167
```

### Expo Push Notifications

> Laisser vide → logs console uniquement.

```env
EXPO_ACCESS_TOKEN=""
```

Côté mobile, créer `apps/mobile/.env` :
```env
EXPO_PUBLIC_API_URL="http://localhost:3000"
EXPO_PUBLIC_PROJECT_ID="votre-project-id-expo"
```

---

## Base de données

```bash
pnpm db:generate    # Regénérer le client après modification du schéma
pnpm db:migrate     # Créer et appliquer les migrations
pnpm db:studio      # Ouvrir Prisma Studio (interface visuelle)

# Réinitialiser (⚠️ supprime toutes les données)
pnpm --filter api exec prisma migrate reset
```

### Données de référence à créer manuellement

Via `pnpm db:studio` ou migration seed :

**Spécialités médicales** (`doctor_specialties`) :
Médecine générale, Pédiatrie, Cardiologie, Gynécologie, Dermatologie, Ophtalmologie…

**Pricing** (`pricing`) — valeurs de départ :
| kind | valeur |
|------|--------|
| `consultation_base_fee` | 5 000 FCFA (`valueFcfa`) |
| `video_usd_per_participant_min` | 0.00099 (`valueNum`) |
| `usd_to_fcfa_rate` | 600 (`valueNum`) |
| `platform_commission_pct` | 15 (`valueNum`) |
| `delivery_base` | 1 000 FCFA (`valueFcfa`) |
| `delivery_per_km` | 200 FCFA (`valueFcfa`) |
| `service_fee` | 500 FCFA (`valueFcfa`) |

---

## Lancer l'application

### Développement

```bash
# Tout en parallèle (recommandé)
pnpm dev

# API seule — http://localhost:3000
pnpm dev --filter api

# Mobile seule
pnpm dev --filter mobile
# Puis : a → Android  |  i → iOS  |  Scanner QR → Expo Go sur device physique
```

### Vérifier que l'API tourne

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

---

## Build production

### API

```bash
pnpm build --filter api
NODE_ENV=production node apps/api/dist/server.js
```

### Mobile — EAS Build (Expo Application Services)

```bash
npm install -g eas-cli
cd apps/mobile

# Configuration initiale (une seule fois)
eas build:configure

# Build Android
eas build --platform android --profile preview

# Build iOS
eas build --platform ios --profile preview

# Soumettre aux stores
eas submit --platform android
eas submit --platform ios
```

---

## Fournisseurs externes

### MyPVIT (paiement)

1. Créer un compte sur [mypvit.pro](https://mypvit.pro)
2. Compléter le KYC marchand
3. Récupérer : Code URL, Code Compte d'opération (`ACC_…`), Code Callback
4. Définir un mot de passe API dans le dashboard → APIs
5. Renseigner les variables `MYPVIT_*` dans `.env`
6. Déclarer l'IP de votre serveur dans le dashboard → Adresses IPs
7. Valider l'intégration : 2 tests succès (< 1 000 XAF) + 2 tests échec (> 1 000 XAF)

### Expo Push Notifications

1. Créer un projet sur [expo.dev](https://expo.dev)
2. Récupérer le **Project ID** → `EXPO_PUBLIC_PROJECT_ID`
3. Générer un Access Token → `EXPO_ACCESS_TOKEN`
4. Android : télécharger `google-services.json` (Firebase) → `apps/mobile/google-services.json`

### Vidéo Daily.co

1. Compte [daily.co](https://daily.co) → récupérer la clé API
2. Implémenter `VideoProvider` dans `apps/api/src/infrastructure/providers/video/daily.ts`
3. Dans `container.ts` : `new DailyVideoProvider(process.env.DAILY_API_KEY)`

### SMS Africa's Talking

1. Compte [africastalking.com](https://africastalking.com)
2. Implémenter `NotificationProvider` dans `apps/api/src/infrastructure/providers/notification/africastalking.ts`
3. Remplacer les `StubNotificationProvider` dans `container.ts`

### Assistance IA (MBOLO Assist)

L'IA **assiste** (elle n'est jamais décisionnaire sur un médicament ou une
validation ; un humain tranche toujours). Auto-activée si `ANTHROPIC_API_KEY`
est défini, sinon un stub conservateur prend le relais (la CI reste verte sans
clé). Chaque capacité est calibrée sur le moteur MBOLO Assist approprié :

| Capacité | Moteur | Où |
|----------|--------|-----|
| Modération des avis | rapide | signale les avis abusifs → file admin |
| Lecture de posologie | rapide | texte libre → horaires de rappel proposés |
| Pré-contrôle KYC (vision) | vision | lisibilité + points d'attention d'un justificatif |

Moteurs réels sélectionnés par défaut (surchargeables via `AI_MODEL_FAST` /
`AI_MODEL_VISION`) : `claude-haiku-4-5` (rapide), `claude-opus-4-8` (vision).

Implémentation : `apps/api/src/infrastructure/providers/ai/` (réel via `fetch`
vers l'API Messages, ou `StubAiProvider`). Sélection dans `container.ts`.

---

## Contrainte légale fondamentale

> La plateforme **n'est jamais** le vendeur du médicament. Le pharmacien reste le **dispensateur légal** et doit valider toute ordonnance avant préparation (`status: pending_validation → validated`). Le livreur est mandaté par l'officine. **Aucune marge** n'est prélevée sur le produit — le revenu provient des frais de service et de livraison uniquement.
