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

## Prisma — c'est quoi exactement ?

### En une phrase

**Prisma est un traducteur** entre le code TypeScript du serveur et la base de données PostgreSQL. Sans lui, il faudrait écrire du SQL à la main — un langage de requête complexe et source d'erreurs.

### Le problème qu'il résout

Les bases de données comme PostgreSQL ne comprennent pas TypeScript. Elles parlent **SQL**, un langage de requête qui ressemble à ça :

```sql
SELECT u.id, u.name, a.status
FROM users u
JOIN appointments a ON a.patient_id = u.id
WHERE a.status = 'pending'
AND u.created_at > '2024-01-01'
ORDER BY a.scheduled_at ASC;
```

Écrire ce SQL manuellement à chaque fois est long, risqué (une faute de frappe = bug), et difficile à maintenir. Prisma remplace ça par du TypeScript simple et lisible.

### Comment ça marche

```
Code TypeScript (serveur)                    SQL (base de données)
──────────────────────────────────────────   ────────────────────────────────────────────────
prisma.user.findUnique({                →    SELECT * FROM users WHERE id = 'abc123'
  where: { id: 'abc123' }                    LIMIT 1;
})

prisma.appointment.create({             →    INSERT INTO appointments
  data: {                                    (patient_id, doctor_id, type, status)
    patientId: 'xyz',                        VALUES ('xyz', 'doctor1', 'immediate', 'pending');
    doctorId:  'doctor1',
    type:      'immediate',
  }
})

prisma.appointment.findMany({           →    SELECT * FROM appointments
  where: {                                   WHERE patient_id = 'xyz'
    patientId: 'xyz',                        AND status IN ('pending', 'confirmed')
    status: { in: ['pending','confirmed'] }  ORDER BY scheduled_at ASC;
  },
  orderBy: { scheduledAt: 'asc' }
})
```

Le développeur écrit du TypeScript → Prisma traduit → la base de données exécute.

### Les deux fichiers clés

**1. `apps/api/prisma/schema.prisma`** — le "plan de la base de données"

Ce fichier décrit toutes les tables et leurs colonnes en un langage simple. C'est la source de vérité — tout part de là.

```prisma
model User {
  id        String   @id @default(cuid())   // identifiant unique généré automatiquement
  phone     String   @unique                 // numéro de téléphone, doit être unique
  name      String?                          // nom (optionnel, le ? signifie "peut être vide")
  role      UserRole @default(patient)       // patient / doctor / pharmacy / courier
  pushToken String?                          // token pour les notifications push
  createdAt DateTime @default(now())         // date de création, remplie automatiquement

  appointments Appointment[] @relation("AppointmentPatient")  // lien vers les rendez-vous
}
```

**2. `apps/api/src/infrastructure/prisma/client.ts`** — la connexion

Ce fichier crée une instance unique de Prisma et la partage dans tout le serveur. Un seul fichier à importer.

```typescript
import { prisma } from '../infrastructure/prisma/client';

// Puis dans n'importe quelle partie du code :
const user = await prisma.user.findUnique({ where: { id: userId } });
```

### Ce que Prisma fait en plus du SQL

- **Génère les types TypeScript automatiquement** — si une colonne s'appelle `scheduledAt`, TypeScript sait que c'est un `Date`, et vous aurez une erreur de compilation si vous essayez d'y mettre un texte.
- **Valide les données avant l'envoi** — impossible d'insérer un champ qui n'existe pas dans le schéma.
- **Gère les relations** — récupérer un patient avec tous ses rendez-vous se fait en une seule ligne (`include: { appointments: true }`).
- **Gère les migrations** — voir section suivante.

### Analogie simple

> Prisma est comme un secrétaire multilingue. Vous lui parlez en TypeScript (votre langue), il traduit en SQL (la langue de la base de données) et vous rapporte la réponse. Vous n'avez jamais besoin d'apprendre le SQL.

---

## Comment le serveur parle à la base de données

Le schéma de toutes les tables est défini dans un seul fichier :

**`apps/api/prisma/schema.prisma`**

Exemple de ce que contient ce fichier :

```prisma
model User {
  id        String   @id @default(cuid())
  phone     String   @unique
  name      String?
  role      UserRole @default(patient)
  pushToken String?
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
