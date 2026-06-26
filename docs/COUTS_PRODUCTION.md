# Coûts et déploiement en production

Ce document explique **où héberger chaque composant**, comment le configurer pas à pas, et combien ça coûte. Les recommandations sont marquées ⭐.

> Prix en USD. 1 USD ≈ 600 FCFA.

---

## Vue d'ensemble — Ce qu'il faut héberger

| Composant | Quoi | Recommandation |
|-----------|------|----------------|
| Serveur API | Le code backend | Railway ⭐ |
| Base de données | PostgreSQL | Supabase ⭐ |
| Cache / OTP | Redis | Upstash ⭐ |
| Vidéo | Daily.co | Daily.co (pas d'alternative) |
| Paiements | MyPVIT | MyPVIT (pas d'alternative) |
| SMS | Africa's Talking | Africa's Talking (pas d'alternative) |
| Push Android | Firebase | Gratuit |
| Push via app | Expo | Gratuit |

---

## 1. Base de données PostgreSQL — Supabase ⭐

**Pourquoi Supabase :** plan gratuit généreux (500 MB), interface claire, sauvegardes automatiques, SSL inclus, connexion Prisma directe sans configuration complexe.

### Tarifs

| Plan | Prix | Stockage | Ce que ça couvre |
|------|------|----------|-----------------|
| Free | **0 €** | 500 MB | Jusqu'à ~50 000 utilisateurs si données légères |
| Pro | **$25/mois** | 8 GB | Production stable |
| Team | $599/mois | Illimité | Grande échelle |

**Recommandation :** Free pour démarrer → Pro quand vous atteignez 500+ utilisateurs actifs.

### Installation pas à pas

**1. Créer un compte**
→ Aller sur [supabase.com](https://supabase.com) → **Start for free** → S'inscrire avec GitHub ou email

**2. Créer un projet**
→ **New Project** → choisir un nom (ex: `mbolo-sante`) → choisir une région (Europe West ou US East pour la latence) → définir un **mot de passe de base de données** (le noter précieusement) → **Create new project**

*La création prend 1–2 minutes.*

**3. Récupérer l'URL de connexion**
→ Menu gauche : **Settings** → **Database** → Section **Connection string** → onglet **URI**

Vous obtenez quelque chose comme :
```
postgresql://postgres:[MOT_DE_PASSE]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

**4. Configurer dans le projet**

Dans `apps/api/.env` sur votre serveur :
```env
DATABASE_URL="postgresql://postgres:[MOT_DE_PASSE]@db.xxxxxxxxxxxx.supabase.co:5432/postgres?sslmode=require"
```

> Le `?sslmode=require` est obligatoire pour la connexion sécurisée.

**5. Appliquer les migrations**

Une fois le serveur déployé (voir section Railway ci-dessous) :
```bash
pnpm db:migrate
pnpm --filter api exec ts-node prisma/seed.ts
```

---

## 2. Cache Redis — Upstash ⭐

**Pourquoi Upstash :** plan gratuit suffisant pour démarrer, serverless (pas de serveur à gérer), facturation à la consommation, compatible avec le client Redis Node.js standard.

### Tarifs

| Plan | Prix | Requêtes/jour | Mémoire |
|------|------|--------------|---------|
| Free | **0 €** | 10 000 | 256 MB |
| Pay-as-you-go | $0.20 / 100 000 requêtes | Illimité | 1 GB |
| Pro | $80/mois | Illimité | 5 GB |

**Recommandation :** Free pour démarrer. À 10 000 req/jour = ~7 connexions simultanées en permanence. Très suffisant jusqu'à quelques centaines d'utilisateurs actifs par jour.

Chaque connexion = ~5 req Redis (OTP store, OTP read, OTP delete, session, etc.) → le plan free couvre ~2 000 connexions/jour.

### Installation pas à pas

**1. Créer un compte**
→ [upstash.com](https://upstash.com) → **Start for free** → S'inscrire

**2. Créer une base Redis**
→ **Create Database** → choisir un nom (ex: `mbolo-redis`) → choisir la région (EU-West-1 ou US-East-1) → **Create**

**3. Récupérer l'URL de connexion**
→ Cliquer sur la base créée → section **REST API** ou **Details**
→ Copier le champ **REDIS_URL** (format : `rediss://default:xxxxx@xxxxx.upstash.io:6380`)

**4. Configurer dans le projet**
```env
REDIS_URL="rediss://default:[PASSWORD]@xxxxx.upstash.io:6380"
```

> Le préfixe `rediss://` (avec deux `s`) indique une connexion TLS sécurisée — obligatoire sur Upstash.

---

## 3. Serveur API — Railway ⭐

**Pourquoi Railway :** déploiement depuis GitHub en 3 clics, variables d'environnement simples à configurer, logs en temps réel, domaine HTTPS automatique, facturation à la consommation (pas d'abonnement fixe surprenant).

### Tarifs

| Plan | Prix | RAM | Ce que ça couvre |
|------|------|-----|-----------------|
| Hobby | **$5/mois** (crédit inclus) | 512 MB | Démarrage, test |
| Pro | Usage-based (~$10–25/mois) | Jusqu'à 8 GB | Production |

**Comment Railway facture :** vous payez ce que vous consommez (CPU + RAM + bande passante). Un serveur API standard avec 200–500 requêtes/jour consomme ~$8–15/mois.

**Recommandation :** Railway pour commencer — tout est dans une seule interface (API + PostgreSQL + Redis si besoin). Migrer vers DigitalOcean si vous voulez plus de contrôle à grande échelle.

### Installation pas à pas

**1. Créer un compte**
→ [railway.app](https://railway.app) → **Login with GitHub**

**2. Créer un projet**
→ **New Project** → **Deploy from GitHub repo** → sélectionner votre dépôt `sanctifie/lave`

**3. Configurer le service API**

Railway détecte automatiquement le monorepo. Il faut lui préciser ce qu'on déploie :

→ Cliquer sur le service créé → **Settings** → **Build Command** :
```bash
pnpm install --frozen-lockfile && pnpm build --filter api
```

→ **Start Command** :
```bash
node apps/api/dist/server.js
```

→ **Root Directory** : laisser vide (Railway part de la racine)

**4. Ajouter les variables d'environnement**

→ Onglet **Variables** → ajouter une par une (ou coller en bulk) :

```
DATABASE_URL=postgresql://postgres:[PASS]@db.xxx.supabase.co:5432/postgres?sslmode=require
REDIS_URL=rediss://default:[PASS]@xxx.upstash.io:6380
JWT_SECRET=[générer avec : openssl rand -hex 32]
JWT_EXPIRES_IN=7d
OTP_TTL_SECONDS=300
NODE_ENV=production
PORT=3000
MYPVIT_BASE_URL=https://api.mypvit.pro/v2
MYPVIT_URL_CODE=
MYPVIT_OPERATION_ACCOUNT_CODE=
MYPVIT_API_PASSWORD=
MYPVIT_CALLBACK_URL_CODE=
EXPO_ACCESS_TOKEN=
DAILY_API_KEY=
AT_API_KEY=
AT_USERNAME=
AT_SENDER_ID=MBOLO
```

Les variables vides (`MYPVIT_*`, etc.) activent les stubs — à remplir au fur et à mesure.

**5. Obtenir le domaine HTTPS**

→ Onglet **Settings** → **Networking** → **Generate Domain**

Vous obtenez une URL comme `mbolo-api-production.up.railway.app`. C'est l'URL à renseigner dans :
- `apps/mobile/.env` → `EXPO_PUBLIC_API_URL=https://mbolo-api-production.up.railway.app`
- Dashboard MyPVIT → URLs → Callback : `https://mbolo-api-production.up.railway.app/payments/webhook`

**6. Premier déploiement**

Chaque `git push` sur la branche `main` déclenche un redéploiement automatique.

Pour les migrations initiales, ouvrir le terminal Railway :
→ Service → **Shell** → taper :
```bash
pnpm db:migrate
node apps/api/prisma/seed.js
```

---

## Alternative serveur — DigitalOcean Droplet

**Quand choisir DigitalOcean plutôt que Railway :** vous voulez un serveur dédié avec IP fixe (requis par MyPVIT pour les appels API), ou vous préférez contrôler l'environnement.

### Tarifs Droplet

| Taille | Prix/mois | RAM | CPU | Recommandé pour |
|--------|-----------|-----|-----|-----------------|
| Basic s-1vcpu-1gb | **$6** | 1 GB | 1 vCPU | Test / très faible charge |
| Basic s-1vcpu-2gb | **$12** | 2 GB | 1 vCPU | Lancement (< 500 users) |
| Basic s-2vcpu-2gb | **$18** | 2 GB | 2 vCPU | Croissance |
| General s-2vcpu-4gb | **$24** | 4 GB | 2 vCPU | Production stable |

### Installation pas à pas

**1. Créer un compte**
→ [digitalocean.com](https://digitalocean.com) → s'inscrire (carte bancaire requise)

**2. Créer un Droplet**
→ **Create** → **Droplets** → choisir :
- Image : **Ubuntu 24.04 LTS**
- Plan : **Basic → $12/mois** (2 GB RAM recommandé)
- Datacenter : **Frankfurt** (le plus proche d'Afrique centrale)
- Authentication : **SSH Key** (plus sécurisé que mot de passe)

**3. Se connecter et installer Node.js**
```bash
ssh root@[IP_DU_DROPLET]

# Installer Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Installer pnpm
npm install -g pnpm

# Installer PM2 (garde le serveur actif en permanence)
npm install -g pm2
```

**4. Cloner et configurer le projet**
```bash
git clone https://github.com/sanctifie/lave.git
cd lave
pnpm install --frozen-lockfile

# Créer le fichier .env
nano apps/api/.env
# Coller les variables d'environnement (même liste que Railway)
```

**5. Builder et démarrer**
```bash
pnpm build --filter api

# Démarrer avec PM2 (redémarre automatiquement si crash)
pm2 start apps/api/dist/server.js --name mbolo-api
pm2 startup  # Pour redémarrer au boot du serveur
pm2 save
```

**6. Configurer HTTPS avec Nginx + Certbot**
```bash
apt-get install -y nginx certbot python3-certbot-nginx

# Configurer Nginx comme reverse proxy
nano /etc/nginx/sites-available/mbolo
```
Contenu du fichier :
```nginx
server {
    server_name api.votre-domaine.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
```bash
ln -s /etc/nginx/sites-available/mbolo /etc/nginx/sites-enabled/
certbot --nginx -d api.votre-domaine.com  # Génère le certificat SSL gratuit
nginx -s reload
```

**7. Déploiements futurs**
```bash
# Sur le droplet
cd lave && git pull && pnpm install && pnpm build --filter api && pm2 restart mbolo-api
```

---

## 4. Daily.co — Vidéo téléconsultation

**Tarif : $0.00099 par participant par minute**
(une consultation de 20 min avec 2 personnes = ~$0.04 = 24 FCFA)

### Installation pas à pas

**1. Créer un compte**
→ [daily.co](https://daily.co) → **Start for free** → s'inscrire

**2. Créer un domaine**
→ Lors de l'inscription, choisir un nom de domaine (ex: `mbolo`) → vos salles seront `https://mbolo.daily.co/consultation-xxx`

**3. Récupérer la clé API**
→ Menu gauche : **Developers** → **API keys** → **Create key** → copier la clé

**4. Implémenter le provider**

Créer le fichier `apps/api/src/infrastructure/providers/video/daily.ts` (le code est dans `docs/PROVIDERS.md`).

**5. Configurer**
```env
DAILY_API_KEY="votre-cle-api"
```

Le `StubVideoProvider` se désactive automatiquement dès que `DAILY_API_KEY` est renseigné.

---

## 5. MyPVIT — Paiements mobile money

**Tarif : commission % sur chaque transaction** (à négocier avec MyPVIT, typiquement 1.5–3%)

Pas d'abonnement mensuel fixe — vous ne payez que sur les transactions réelles.

### Installation pas à pas

**1. Créer un compte marchand**
→ [mypvit.pro](https://mypvit.pro) → **S'inscrire** → remplir le formulaire marchand

**2. Compléter le KYC (1–3 jours ouvrés)**

Documents nécessaires :
- Pièce d'identité du responsable
- RCCM de l'entreprise (si personne morale)
- Numéro de téléphone Airtel Money ou Moov Money pour recevoir les paiements

**3. Accéder au dashboard et récupérer les identifiants**

Une fois le compte validé :

→ Menu **Comptes** → copier le **Code du compte d'opération** (format `ACC_XXXXXXXXXXXX`)

→ Menu **APIs** → définir un **mot de passe API** (à conserver) → copier le **Code URL**

→ Menu **URLs** → **+ Ajouter** → Type : **Callback** → URL :
```
https://votre-domaine.railway.app/payments/webhook
```
→ Copier le **Code Callback** généré

**4. Déclarer l'IP de votre serveur**

→ Menu **Adresses IPs** → ajouter l'IP de votre serveur Railway ou DigitalOcean

*(Sur Railway, l'IP peut changer — contacter Railway support pour une IP fixe, ou utiliser DigitalOcean)*

**5. Configurer**
```env
MYPVIT_BASE_URL="https://api.mypvit.pro/v2"
MYPVIT_URL_CODE="votre_code_url"
MYPVIT_OPERATION_ACCOUNT_CODE="ACC_XXXXXXXXXXXX"
MYPVIT_API_PASSWORD="votre_mot_de_passe"
MYPVIT_CALLBACK_URL_CODE="votre_code_callback"
```

**6. Autoriser les IPs MyPVIT dans votre firewall**

Si vous utilisez DigitalOcean, créer une règle firewall entrant pour :
```
176.31.65.18 / 176.31.65.20 / 176.31.65.21 / 13.59.249.167
```
*(Railway gère le firewall automatiquement)*

**7. Valider l'intégration (obligatoire)**

MyPVIT exige des tests avant d'activer la production :
- 2 paiements réussis avec montant < 1 000 XAF
- 2 paiements échoués avec montant > 1 000 XAF
- Vérification que le webhook répond correctement

---

## 6. Africa's Talking — SMS

**Tarif Gabon : vérifier sur [africastalking.com/sms](https://africastalking.com/sms)** après création du compte.
Estimé ~$0.03–0.05 par SMS.

### Installation pas à pas

**1. Créer un compte**
→ [africastalking.com](https://africastalking.com) → **Register** → s'inscrire

**2. Créer une application**
→ Menu **Apps** → **Create app** → nommer `mbolo-sante`

**3. Récupérer les identifiants**
→ Cliquer sur l'application → **Settings** → copier la **API Key**
→ Le **Username** est votre identifiant de compte AT (visible en haut à droite)

**4. Demander un Sender ID (nom expéditeur)**

Sans Sender ID, les SMS partent d'un numéro court générique. Avec `MBOLO`, les patients voient "De : MBOLO".

→ Menu **SMS** → **Sender IDs** → **Request** → nom : `MBOLO` → justification : plateforme santé

*(Approbation par Africa's Talking en 1–3 jours)*

**5. Alimenter le compte**
→ Menu **Billing** → **Top Up** → virement par carte ou virement bancaire

**6. Implémenter et configurer**

Le code du provider est dans `docs/PROVIDERS.md` (section Africa's Talking).

```env
AT_API_KEY="votre_cle_api"
AT_USERNAME="votre_username"
AT_SENDER_ID="MBOLO"
```

---

## 7. Firebase — Gratuit

Firebase est requis uniquement pour les notifications push Android. **Complètement gratuit.**

### Installation pas à pas

**1. Créer un projet Firebase**
→ [console.firebase.google.com](https://console.firebase.google.com) → **Créer un projet** → nom : `mbolo-sante`

**2. Ajouter une application Android**
→ Dans le projet → **Ajouter une application** → icône Android
→ Package name : `com.mbolo.sante`
→ Télécharger `google-services.json`

**3. Placer le fichier**
```bash
cp google-services.json apps/mobile/google-services.json
```

**4. Ajouter comme secret GitHub** (pour le build APK automatique)
→ GitHub → Settings → Secrets and variables → Actions → **New repository secret**
→ Nom : `GOOGLE_SERVICES_JSON` → Valeur : coller le contenu du fichier JSON

---

## 8. Expo — Gratuit

**Expo Push Notifications est gratuit**, sans limite de volume.

### Installation pas à pas

**1. Créer un compte**
→ [expo.dev](https://expo.dev) → **Sign Up**

**2. Créer un projet**
→ **Create Project** → nom : `mbolo-sante` → récupérer le **Project ID** (UUID)

**3. Générer un Access Token**
→ Icône compte → **Access Tokens** → **Create Token** → copier

**4. Configurer**

`apps/mobile/app.json` → section `extra.eas.projectId` : mettre le Project ID

`apps/api/.env` :
```env
EXPO_ACCESS_TOKEN="votre_token"
```

`apps/mobile/.env` :
```env
EXPO_PUBLIC_PROJECT_ID="votre-project-id-uuid"
```

---

## Récapitulatif des coûts par phase

### Phase 1 — Lancement et tests (< 100 utilisateurs actifs)

| Service | Plan | Prix/mois |
|---------|------|-----------|
| Railway (serveur API) | Hobby | $5 |
| Supabase (PostgreSQL) | Free | $0 |
| Upstash (Redis) | Free | $0 |
| Daily.co (vidéo) | Pay-as-you-go | ~$2 |
| Africa's Talking (SMS) | Pay-as-you-go | ~$5 |
| MyPVIT (paiements) | % transactions | % du CA |
| Firebase + Expo | Gratuit | $0 |
| **Total fixe mensuel** | | **~$12/mois** |

### Phase 2 — Croissance (500 utilisateurs, 200 consultations/mois)

| Service | Plan | Prix/mois |
|---------|------|-----------|
| Railway (serveur API) | Pro | ~$15 |
| Supabase (PostgreSQL) | Pro | $25 |
| Upstash (Redis) | Pay-as-you-go | ~$3 |
| Daily.co (vidéo) | Pay-as-you-go | ~$8 |
| Africa's Talking (SMS) | Pay-as-you-go | ~$25 |
| MyPVIT (paiements) | % transactions | % du CA |
| Firebase + Expo | Gratuit | $0 |
| **Total fixe mensuel** | | **~$76/mois** |

### Phase 3 — Production stable (2 000 utilisateurs, 1 000 consultations/mois)

| Service | Plan | Prix/mois |
|---------|------|-----------|
| DigitalOcean Droplet ($24) | General 2vCPU/4GB | $24 |
| Supabase (PostgreSQL) | Pro | $25 |
| Redis Cloud | Essentials | $15 |
| Daily.co (vidéo) | Pay-as-you-go | ~$40 |
| Africa's Talking (SMS) | Pay-as-you-go | ~$80 |
| MyPVIT (paiements) | % transactions | % du CA |
| Firebase + Expo | Gratuit | $0 |
| **Total fixe mensuel** | | **~$184/mois** |

---

## Ma recommandation de stack pour démarrer

```
Serveur API     → Railway          ($5/mois, déploiement en 5 min depuis GitHub)
Base de données → Supabase         (gratuit au démarrage)
Redis           → Upstash          (gratuit au démarrage)
Vidéo           → Daily.co         (paiement à l'usage)
Paiements       → MyPVIT           (commission uniquement)
SMS             → Africa's Talking (paiement à l'usage)
Push            → Expo + Firebase  (gratuit)
```

**Coût total au lancement : ~$12/mois** — soit moins de 8 000 FCFA par mois pour faire tourner toute la plateforme.
