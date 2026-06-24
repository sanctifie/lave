# Base de données — Où elle est, comment ça marche

---

## En deux mots

La base de données contient **toutes les données permanentes** de la plateforme : utilisateurs, ordonnances, rendez-vous, transactions, livraisons. Elle est séparée du serveur — c'est un programme indépendant (PostgreSQL) auquel le serveur se connecte via Internet ou en local.

---

## En développement (sur l'ordinateur du développeur)

En local, la base de données **tourne dans un conteneur Docker** sur la même machine que le serveur. Docker permet de faire tourner PostgreSQL sans l'installer manuellement.

```
Votre ordinateur
│
├── Terminal 1 : docker-compose up -d   ← Lance PostgreSQL + Redis dans Docker
├── Terminal 2 : pnpm dev --filter api  ← Lance le serveur API
└── Terminal 3 : pnpm dev --filter mobile ← Lance l'app mobile
```

**Fichier de configuration Docker** : `docker-compose.yml` à la racine du projet

```yaml
services:
  postgres:
    image: postgres:16-alpine       # PostgreSQL version 16
    environment:
      POSTGRES_USER: mbolo
      POSTGRES_PASSWORD: mbolo_dev
      POSTGRES_DB: mbolo_sante
    ports:
      - "5432:5432"                 # Port accessible depuis le serveur local
    volumes:
      - postgres_data:/var/data     # Les données survivent aux redémarrages

  redis:
    image: redis:7-alpine           # Cache pour les OTP et sessions
    ports:
      - "6379:6379"
```

**Connexion déclarée dans** `apps/api/.env` :
```env
DATABASE_URL="postgresql://mbolo:mbolo_dev@localhost:5432/mbolo_sante"
REDIS_URL="redis://localhost:6379"
```

`localhost` = la même machine. `5432` = port standard de PostgreSQL.

---

## Comment le serveur parle à la base de données

Le serveur n'écrit **jamais** de SQL manuellement. Il utilise **Prisma** — un ORM (Object-Relational Mapper) qui traduit automatiquement le code TypeScript en requêtes SQL.

```
Code TypeScript (serveur)           SQL (base de données)
─────────────────────────           ─────────────────────
prisma.user.findUnique(...)    →    SELECT * FROM users WHERE id = ?
prisma.appointment.create(...) →    INSERT INTO appointments (...)
```

Le schéma de toutes les tables est défini dans un seul fichier :

**`apps/api/prisma/schema.prisma`**

Exemple de ce que contient ce fichier :

```prisma
model User {
  id        String   @id @default(cuid())
  phone     String   @unique
  name      String?
  role      UserRole @default(patient)
  pushToken String?  // token pour les notifications push
  createdAt DateTime @default(now())

  appointments Appointment[] @relation("AppointmentPatient")
  ...
}
```

---

## Commandes essentielles

```bash
# Après avoir modifié schema.prisma — crée et applique la migration SQL
pnpm db:migrate

# Regénère le client TypeScript (après migrate ou changement de schéma)
pnpm db:generate

# Ouvre une interface visuelle pour voir et modifier les données
pnpm db:studio

# Insérer les données de référence initiales (pricing, etc.)
pnpm --filter api exec ts-node prisma/seed.ts

# Réinitialiser complètement la base (⚠️ supprime tout)
pnpm --filter api exec prisma migrate reset
```

---

## Les migrations — c'est quoi ?

Chaque fois qu'on modifie la structure de la base (ajouter une colonne, une table, etc.), on crée une **migration** — un fichier SQL qui décrit exactement le changement à appliquer.

```
Exemples de migrations récentes :
→ Ajout de pushToken sur la table users
→ Ajout du statut waiting_room sur les appointments
→ Création de la table consultations
```

Prisma génère ces fichiers automatiquement. La commande `pnpm db:migrate` :
1. Détecte ce qui a changé dans `schema.prisma`
2. Génère le fichier SQL correspondant
3. L'applique sur la base de données
4. Enregistre que cette migration a été faite (pour ne pas la refaire)

---

## En production (serveur cloud)

En production, la base de données **ne tourne pas sur le même serveur** que l'API. On utilise un service managé — une base hébergée dans le cloud par un fournisseur spécialisé. Le serveur API s'y connecte via une URL sécurisée.

```
Cloud
│
├── Serveur API (VPS / Railway / Render)
│     └── se connecte via DATABASE_URL
│
└── Base de données managée (Supabase / Railway / DigitalOcean)
      └── PostgreSQL 16, sauvegardes automatiques, SSL
```

**Fournisseurs recommandés** → voir `docs/COUTS_PRODUCTION.md`

**Configuration production** (`apps/api/.env` sur le serveur) :
```env
DATABASE_URL="postgresql://user:password@host.supabase.com:5432/postgres?sslmode=require"
REDIS_URL="rediss://default:password@host.upstash.io:6380"
```

**Important :** en production, ne jamais lancer `pnpm db:migrate` automatiquement au démarrage. Lancer les migrations manuellement après avoir vérifié leur contenu.

---

## Structure complète des tables

```
users                    ← Tous les comptes (patients, médecins, pharmaciens…)
  └── doctor_profiles    ← Profil médecin (spécialité, tarif, disponibilité)
  └── partner_profiles   ← Profil partenaire (pharmacie, cuisine, transporteur)

appointments             ← Rendez-vous (lien patient ↔ médecin)
  └── consultations      ← Déroulement (durée, notes, statut)
       └── video_sessions← Tokens et URL de la salle vidéo Daily.co
       └── prescriptions ← Ordonnance émise pendant la consultation

prescriptions            ← Ordonnances uploadées par le patient
  └── prescription_items ← Médicaments validés par le pharmacien
  └── orders             ← Commande créée après validation
       └── deliveries    ← Livraison associée à la commande
       └── transactions  ← Paiement en escrow

pricing                  ← Tarifs configurables (base fee, commission, etc.)
doctor_specialties       ← Liste des spécialités médicales
doctor_availabilities    ← Créneaux hebdomadaires par médecin
```

---

## Données à créer après installation

Après `pnpm db:migrate`, deux tables doivent être remplies manuellement :

### 1. Spécialités médicales (`doctor_specialties`)

Via `pnpm db:studio` → table `doctor_specialties` → créer :

| name |
|------|
| Médecine générale |
| Pédiatrie |
| Dermatologie |
| Cardiologie |
| Gynécologie |
| Psychologie |
| Psychiatrie |
| ORL |
| Pneumologie |
| Endocrinologie |
| Diabétologie |
| Nutrition |
| Neurologie |
| Ophtalmologie |
| Rhumatologie |
| Urologie |

### 2. Tarifs (`pricing`)

Insérer via le seed : `pnpm --filter api exec ts-node prisma/seed.ts`

| kind | valeur |
|------|--------|
| `consultation_base_fee` | 2 000 FCFA |
| `video_usd_per_participant_min` | 0.00099 $ |
| `usd_to_fcfa_rate` | 600 |
| `platform_commission_pct` | 0.15 (= 15%) |
| `delivery_base` | 1 000 FCFA |
| `delivery_per_km` | 200 FCFA |
| `service_fee` | 500 FCFA |

Ces valeurs sont configurables sans redéployer — modifier directement en base via Prisma Studio.
