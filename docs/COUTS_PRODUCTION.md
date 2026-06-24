# Coûts de production — Tous les services et leurs tarifs

Ce document liste **tous les services nécessaires pour faire tourner MBOLO Santé en production**, avec leurs tarifs actuels et des estimations de coût mensuel selon le volume d'utilisation.

> Les prix sont en dollars (USD) sauf indication. 1 USD ≈ 600 FCFA (taux configuré dans `pricing`).

---

## Récapitulatif rapide

| Service | Rôle | Coût minimal | Coût estimé à 500 patients/mois |
|---------|------|-------------|----------------------------------|
| Serveur API | Héberge le backend | $6/mois | $12–20/mois |
| PostgreSQL | Base de données | Gratuit (limité) | $15–25/mois |
| Redis | Cache / OTP | Gratuit (limité) | $0–10/mois |
| Daily.co | Vidéo téléconsultation | Gratuit (limité) | $30–80/mois |
| MyPVIT | Paiement mobile money | % sur transaction | % sur CA |
| Africa's Talking | SMS / OTP | ~$0.04/SMS | $10–40/mois |
| Expo Push | Notifications mobiles | **Gratuit** | Gratuit |
| Firebase FCM | Push Android | **Gratuit** | Gratuit |
| **Total estimé** | | **~$6/mois** | **$70–180/mois + commissions** |

---

## 1. Serveur API (hébergement du backend)

C'est là que tourne le code du serveur (`apps/api`).

### Options recommandées

#### Railway ⭐ (recommandé pour démarrer)
- **Starter** : $5/mois — 512 MB RAM, suffisant pour démarrer
- **Pro** : usage-based (~$10–20/mois pour un projet actif)
- Avantage : inclut PostgreSQL et Redis dans la même interface
- Site : [railway.app](https://railway.app)

#### Render
- **Free** : s'arrête après 15 min d'inactivité (pas adapté prod)
- **Starter** : $7/mois — 512 MB RAM, toujours actif
- Site : [render.com](https://render.com)

#### DigitalOcean Droplet
- **Basic** : $6/mois — 1 GB RAM, 1 vCPU, 25 GB SSD
- **Standard** : $12/mois — 2 GB RAM (recommandé pour 500+ users)
- Avantage : contrôle total, prix prévisible
- Site : [digitalocean.com](https://digitalocean.com)

#### Contabo (VPS Europe)
- **Cloud VPS S** : ~€5.50/mois — 4 vCPU, 8 GB RAM (très bon rapport qualité/prix)
- Idéal si vous voulez un vrai serveur dédié à bas prix
- Site : [contabo.com](https://contabo.com)

---

## 2. Base de données PostgreSQL

La base de données doit être hébergée **séparément** du serveur API pour la fiabilité et les sauvegardes automatiques.

### Options recommandées

#### Supabase ⭐ (recommandé)
| Plan | Prix | Stockage | Connexions |
|------|------|----------|------------|
| Free | Gratuit | 500 MB | 50 |
| Pro | $25/mois | 8 GB | 500 |
| Team | $599/mois | illimité | illimité |

- Le plan **Free** suffit pour tester et les premières centaines d'utilisateurs
- Inclut sauvegardes, tableau de bord, logs
- Site : [supabase.com](https://supabase.com)

#### Railway PostgreSQL
- Inclus dans l'abonnement Railway
- ~$5–10/mois selon l'usage (facturation à la consommation)

#### DigitalOcean Managed PostgreSQL
- **Basic** : $15/mois — 1 GB RAM, 10 GB SSD
- Sauvegardes quotidiennes incluses
- Recommandé si vous utilisez déjà DigitalOcean pour le serveur

#### Neon (PostgreSQL serverless)
- **Free** : 0.5 GB, parfait pour débuter
- **Launch** : $19/mois — 10 GB
- Site : [neon.tech](https://neon.tech)

---

## 3. Redis (cache / codes OTP)

Redis stocke les codes OTP (5 min) et les sessions temporaires. C'est léger.

### Options recommandées

#### Upstash ⭐ (recommandé)
| Plan | Prix | Requêtes/jour |
|------|------|--------------|
| Free | Gratuit | 10 000 |
| Pay-as-you-go | $0.2 / 100k requêtes | illimité |

- Le plan gratuit suffit jusqu'à ~200 connexions/jour
- Site : [upstash.com](https://upstash.com)

#### Redis Cloud
- **Free** : 30 MB — suffisant pour le cache OTP
- **Essentials** : $5/mois — 100 MB
- Site : [redis.io/cloud](https://redis.io/cloud)

#### Railway Redis
- Inclus dans l'abonnement Railway (~$1–3/mois à la consommation)

---

## 4. Daily.co — Vidéo téléconsultation

La vidéo est la partie la plus coûteuse à l'échelle. Daily.co facture au temps de connexion.

### Tarifs

| Plan | Prix | Inclus |
|------|------|--------|
| Developer (dev) | Gratuit | 1 000 minutes/mois, 2 participants max |
| Pay-as-you-go | **$0.00099 / participant·minute** | Illimité |

### Calcul concret

Une consultation dure en moyenne 20 minutes avec 2 participants :
- Coût par consultation = 20 min × 2 participants × $0.00099 = **$0.0396** (~24 FCFA)
- 100 consultations/mois = **$3.96/mois**
- 500 consultations/mois = **$19.80/mois**
- 2 000 consultations/mois = **$79.20/mois**

**C'est pourquoi le frais vidéo est facturé au patient** : il est calculé automatiquement dans `consultation_base_fee` + `video_usd_per_participant_min`.

### Remarque importante
Le frais vidéo répercuté au patient dans l'app (calculé en FCFA selon le taux USD/FCFA configuré) couvre exactement ce que Daily.co facture — MBOLO ne perd pas d'argent sur la vidéo.

Site : [daily.co/pricing](https://www.daily.co/pricing)

---

## 5. MyPVIT — Paiement mobile money

MyPVIT prend une **commission sur chaque transaction**. Il n'y a pas d'abonnement mensuel fixe.

### Tarifs

Les frais exacts dépendent de votre contrat marchand. À titre indicatif pour les passerelles mobile money en Afrique centrale :

| Type | Commission estimée |
|------|-------------------|
| Airtel Money Gabon | ~1.5–3% par transaction |
| Moov Money Gabon | ~1.5–3% par transaction |

**À confirmer directement avec MyPVIT** lors de la signature du contrat marchand. Contacter : [mypvit.pro](https://mypvit.pro)

### Impact sur MBOLO

La commission MyPVIT est un coût qui s'ajoute aux frais de service MBOLO. Deux options :
1. **L'absorber** dans la commission MBOLO (15% actuel)
2. **La répercuter** sur le patient (ajouter un frais de paiement)

### Prérequis
- Compte marchand validé (KYC — 1 à 3 jours)
- Serveur avec IP fixe déclarée dans le dashboard MyPVIT

---

## 6. Africa's Talking — SMS

Utilisé pour les codes OTP d'authentification et les alertes SMS.

### Tarifs (Gabon)

| Type de SMS | Tarif estimé |
|-------------|-------------|
| SMS sortant (Gabon) | ~$0.03–0.05 / SMS |

**Vérifier le tarif exact Gabon** sur [africastalking.com/pricing](https://africastalking.com/pricing) après création du compte — les tarifs varient par opérateur et par pays.

### Calcul concret

Chaque connexion = 1 SMS OTP. Chaque alerte = 1 SMS.
- 200 connexions/mois + 100 alertes = 300 SMS × $0.04 = **$12/mois**
- 1 000 connexions/mois + 500 alertes = 1 500 SMS × $0.04 = **$60/mois**

### Optimisation possible
- Les SMS OTP sont obligatoires (sécurité)
- Les alertes (ex: "Votre médecin est prêt") sont remplacées par des push notifications gratuites si le patient a installé l'app — le SMS n'est envoyé qu'en backup

---

## 7. Expo Push Notifications — Gratuit

Les notifications push (alertes en temps réel dans l'app) sont **entièrement gratuites**.

Expo ne facture pas les notifications push.

Seule contrainte : avec un Access Token, les notifications sont prioritaires et sans limite de débit. Sans token, il y a une limite de débit mais ça reste gratuit.

Site : [expo.dev/pricing](https://expo.dev/pricing)

---

## 8. Firebase Cloud Messaging (FCM) — Gratuit

FCM est le service Google qui délivre les notifications push sur Android. Il est **entièrement gratuit**, sans limite de volume.

---

## 9. Build APK — GitHub Actions (Gratuit)

Le workflow de build APK (`.github/workflows/build-apk.yml`) tourne sur GitHub Actions.

| Plan GitHub | Minutes gratuites/mois |
|-------------|----------------------|
| Free (dépôt public) | Illimité |
| Free (dépôt privé) | 2 000 min |
| Pro | 3 000 min |

Un build APK prend ~15–20 minutes. Avec 2 000 minutes gratuites = ~100 builds/mois.

---

## Estimations mensuelles par volume

### Phase de lancement (< 100 patients actifs)

| Service | Plan | Coût |
|---------|------|------|
| Serveur API | Railway Starter | $5 |
| PostgreSQL | Supabase Free | $0 |
| Redis | Upstash Free | $0 |
| Daily.co | Pay-as-you-go | ~$2 |
| Africa's Talking | Pay-as-you-go | ~$5 |
| MyPVIT | % transactions | % CA |
| Expo / Firebase | Gratuit | $0 |
| **Total fixe** | | **~$12/mois** |

### Croissance (500 patients actifs, ~200 consultations/mois)

| Service | Plan | Coût |
|---------|------|------|
| Serveur API | Railway Pro ou DO $12 | $12–20 |
| PostgreSQL | Supabase Pro | $25 |
| Redis | Upstash pay-as-you-go | ~$3 |
| Daily.co | Pay-as-you-go | ~$8 |
| Africa's Talking | Pay-as-you-go | ~$20 |
| MyPVIT | % transactions | % CA |
| **Total fixe** | | **~$70–80/mois** |

### Opérationnel (2 000 patients actifs, ~1 000 consultations/mois)

| Service | Plan | Coût |
|---------|------|------|
| Serveur API | VPS 2 vCPU / 4 GB | ~$25 |
| PostgreSQL | DO Managed ou Supabase Pro | $25–50 |
| Redis | Redis Cloud Essentials | $15 |
| Daily.co | Pay-as-you-go | ~$40 |
| Africa's Talking | Pay-as-you-go | ~$80 |
| MyPVIT | % transactions | % CA |
| **Total fixe** | | **~$185–210/mois** |

---

## Ordre de mise en place pour la production

1. **MyPVIT** (1–3 jours validation KYC) — commencer les démarches en premier
2. **Serveur + PostgreSQL + Redis** — Railway ou DigitalOcean, 30 min
3. **Expo Push** — création compte expo.dev, 10 min
4. **Firebase** — télécharger `google-services.json`, 10 min
5. **Daily.co** — créer compte + clé API, 10 min
6. **Africa's Talking** — créer compte + alimenter, 20 min

---

## Variables d'environnement de production

Une fois tous les services configurés, compléter `apps/api/.env` sur le serveur :

```env
# Base de données (Supabase / Railway / DigitalOcean)
DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
REDIS_URL="rediss://default:pass@host:6380"

# JWT
JWT_SECRET="minimum-32-caracteres-generes-aleatoirement"
JWT_EXPIRES_IN="7d"
OTP_TTL_SECONDS=300

NODE_ENV=production
PORT=3000

# MyPVIT
MYPVIT_BASE_URL="https://api.mypvit.pro/v2"
MYPVIT_URL_CODE="votre_code_url"
MYPVIT_OPERATION_ACCOUNT_CODE="ACC_XXXXXXXXXXXX"
MYPVIT_API_PASSWORD="votre_mot_de_passe_api"
MYPVIT_CALLBACK_URL_CODE="votre_code_callback"

# Expo Push
EXPO_ACCESS_TOKEN="votre_token_expo"

# Daily.co
DAILY_API_KEY="votre_cle_api_daily"

# Africa's Talking
AT_API_KEY="votre_cle_api"
AT_USERNAME="votre_username"
AT_SENDER_ID="MBOLO"
```
