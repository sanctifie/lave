# Services externes — Présentation et configuration

Ce document explique **à quoi sert chaque service externe**, comment créer un compte, et comment le configurer dans MBOLO Santé. Tous les services ont un **stub (simulation)** activé par défaut en développement — aucun compte requis pour démarrer.

---

## Sommaire

| Service | Rôle | Requis en prod |
|---------|------|----------------|
| [Expo](#expo) | Framework mobile + push notifications | Oui |
| [MyPVIT](#mypvit) | Paiement mobile money (Airtel / Moov) | Oui |
| [Daily.co](#dailyco) | Sessions vidéo téléconsultation | Oui |
| [Africa's Talking](#africas-talking) | SMS (OTP, alertes) | Recommandé |
| [Firebase](#firebase-google-services) | Push Android (requis par Expo) | Oui (Android) |

---

## Expo

### Qu'est-ce que c'est ?

**Expo** est le framework utilisé pour construire et distribuer l'application mobile MBOLO Santé. Il sert à deux choses distinctes :

1. **Framework de développement** — toute l'application mobile (`apps/mobile`) est écrite avec React Native + Expo. C'est la base du projet mobile, pas optionnel.
2. **Service de notifications push** — Expo fournit une API unifiée pour envoyer des notifications sur iOS et Android sans gérer APNs (Apple) et FCM (Google) séparément.

### Sans compte Expo

En développement, les notifications push sont simulées (logs console). L'application fonctionne complètement sans compte Expo.

Pour **builder un APK** sans compte Expo, il faut désactiver le `projectId` dans `app.json` :

```json
// apps/mobile/app.json — build sans compte Expo
{
  "expo": {
    "name": "MBOLO Santé",
    "slug": "mbolo-sante",
    ...
    // Supprimer ou laisser vide la section "extra.eas"
  }
}
```

### Créer un compte Expo (pour les push en production)

1. Aller sur [expo.dev](https://expo.dev) → **Sign Up** (gratuit)
2. Créer un nouveau projet → **Create Project** → nommer le `mbolo-sante`
3. Récupérer le **Project ID** (format UUID : `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Configuration

**`apps/mobile/app.json`** — ajouter le projectId :
```json
{
  "expo": {
    ...
    "extra": {
      "eas": {
        "projectId": "votre-project-id-uuid"
      }
    }
  }
}
```

**`apps/mobile/.env`** :
```env
EXPO_PUBLIC_PROJECT_ID="votre-project-id-uuid"
```

### Générer l'Access Token (pour le backend)

1. Sur [expo.dev](https://expo.dev) → icône compte (en haut à droite) → **Access tokens**
2. **Create token** → copier le token

**`apps/api/.env`** :
```env
EXPO_ACCESS_TOKEN="votre-token"
```

Sans ce token, les notifications sont quand même envoyées mais sans garantie de livraison et avec des limites de débit.

### Builder l'APK avec EAS (optionnel — alternative au workflow GitHub)

EAS (Expo Application Services) est le service cloud d'Expo pour builder les APK/IPA.

```bash
# Installer EAS CLI
npm install -g eas-cli

# Se connecter
eas login

# Dans apps/mobile — configuration initiale (une seule fois)
eas build:configure

# Builder l'APK
eas build --platform android --profile preview
```

Créer `apps/mobile/eas.json` :
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  }
}
```

L'APK est disponible en téléchargement sur [expo.dev](https://expo.dev) après le build (~10 min).

---

## MyPVIT

### Qu'est-ce que c'est ?

**MyPVIT** ([mypvit.pro](https://mypvit.pro)) est la passerelle de paiement mobile money utilisée par MBOLO Santé pour encaisser les paiements des patients via :
- **Airtel Money** (Gabon)
- **Moov Money** (Gabon)

Le flux : patient initie le paiement dans l'app → MyPVIT envoie une demande USSD au téléphone du patient → patient confirme → MyPVIT notifie MBOLO via webhook → transaction capturée → médecin rémunéré automatiquement.

### Sans compte MyPVIT

En développement, les paiements sont simulés (`StubPaymentProvider`) — les transactions passent directement en "succès" dans les logs. Aucune configuration requise.

### Créer un compte marchand

1. Aller sur [mypvit.pro](https://mypvit.pro) → **S'inscrire**
2. Compléter le profil marchand (KYC) : identité, coordonnées, RCCM si entreprise
3. Attendre la validation par l'équipe MyPVIT (1-3 jours ouvrés)
4. Accéder au **dashboard marchand**

### Récupérer les identifiants

Dans le dashboard MyPVIT :

**1. Code du Compte d'Opération**
- Menu → **Comptes**
- Récupérer le code du compte TEST (commence par `ACC_`)
- En production : créer des comptes par opérateur (Airtel, Moov)

**2. Code URL et mot de passe API**
- Menu → **APIs**
- Définir un mot de passe fort pour l'API Secret (garder-le précieusement)
- Récupérer le **Code URL**

**3. Code Callback (Webhook)**
- Menu → **URLs** → bouton **+URL**
- Type : **Callback**
- URL : `https://votre-domaine.com/payments/webhook`
- Récupérer le **Code Callback** généré

### Configuration

**`apps/api/.env`** :
```env
MYPVIT_BASE_URL="https://api.mypvit.pro/v2"
MYPVIT_URL_CODE="votre_code_url"
MYPVIT_OPERATION_ACCOUNT_CODE="ACC_XXXXXXXXXXXX"
MYPVIT_API_PASSWORD="votre_mot_de_passe_api"
MYPVIT_CALLBACK_URL_CODE="votre_code_callback"
```

### Sécuriser le serveur (production)

Déclarer l'IP de votre serveur dans le dashboard → **Adresses IPs** pour restreindre qui peut appeler l'API MyPVIT.

Autoriser les IPs MyPVIT dans votre firewall (pour recevoir les callbacks) :
```
176.31.65.18
176.31.65.20
176.31.65.21
13.59.249.167
```

### Tester l'intégration (sandbox)

- Montant **< 1 000 XAF** → simulation de succès
- Montant **> 1 000 XAF** → simulation d'échec

MyPVIT exige **au moins 2 tests succès + 2 tests échec** avec gestion correcte du webhook avant de valider le passage en production.

### Opérateurs supportés

| Opérateur | Code API |
|-----------|----------|
| Airtel Money Gabon | `AIRTEL_MONEY` |
| Moov Money Gabon | `MOOV_MONEY` |

---

## Daily.co

### Qu'est-ce que c'est ?

**Daily.co** ([daily.co](https://daily.co)) est le service de visioconférence utilisé pour les téléconsultations. Il fournit des salles vidéo sécurisées avec tokens d'accès séparés pour le médecin (hôte) et le patient (invité).

### Sans compte Daily.co

En développement, le `StubVideoProvider` simule la création de salles vidéo (URLs fictives). Les consultations fonctionnent normalement sans vidéo réelle.

### Créer un compte

1. [daily.co](https://daily.co) → **Start for free**
2. Créer un espace (ex: `mbolo`)
3. Menu → **Developers** → récupérer la **clé API**

### Implémenter le provider

Créer `apps/api/src/infrastructure/providers/video/daily.ts` :

```typescript
import { VideoProvider, VideoRoomParams, VideoRoomResult } from './index';

export class DailyVideoProvider implements VideoProvider {
  constructor(private readonly apiKey: string) {}

  async createRoom(params: VideoRoomParams): Promise<VideoRoomResult> {
    const resp = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        name:       `mbolo-${params.consultationId}`,
        properties: {
          exp:           Math.floor(params.expiresAt.getTime() / 1000),
          enable_chat:   false,
          max_participants: 2,
        },
      }),
    });
    const room: any = await resp.json();

    // Générer les tokens d'accès hôte et invité
    const [hostToken, guestToken] = await Promise.all([
      this.createToken(room.name, true),
      this.createToken(room.name, false),
    ]);

    return {
      roomName:   room.name,
      roomUrl:    room.url,
      hostToken,
      guestToken,
    };
  }

  async closeRoom(roomName: string): Promise<void> {
    await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method:  'DELETE',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
  }

  private async createToken(roomName: string, isOwner: boolean): Promise<string> {
    const resp = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        properties: { room_name: roomName, is_owner: isOwner },
      }),
    });
    const data: any = await resp.json();
    return data.token;
  }
}
```

### Activer le provider

Dans `apps/api/src/infrastructure/container.ts` :
```typescript
import { DailyVideoProvider } from './providers/video/daily';

export const videoProvider = process.env.DAILY_API_KEY
  ? new DailyVideoProvider(process.env.DAILY_API_KEY)
  : new StubVideoProvider();
```

**`apps/api/.env`** :
```env
DAILY_API_KEY="votre_cle_api_daily"
```

---

## Africa's Talking

### Qu'est-ce que c'est ?

**Africa's Talking** ([africastalking.com](https://africastalking.com)) est la passerelle SMS utilisée pour envoyer les codes OTP d'authentification et les alertes par SMS (ex: "Votre médecin est prêt").

### Sans compte Africa's Talking

En développement, les SMS sont simulés (`StubNotificationProvider`) — les messages s'affichent dans les logs du serveur. Les codes OTP s'affichent aussi dans les logs pour faciliter les tests.

### Créer un compte

1. [africastalking.com](https://africastalking.com) → **Register**
2. Créer une application (ex: `mbolo-sante`)
3. Menu → **SMS** → récupérer la **clé API** et le **nom d'expéditeur** (Sender ID)
4. Alimenter le compte avec du crédit SMS

### Implémenter le provider

Créer `apps/api/src/infrastructure/providers/notification/africastalking.ts` :

```typescript
import { NotificationProvider, NotificationParams } from './index';
import AfricasTalking from 'africastalking';

export class AfricasTalkingProvider implements NotificationProvider {
  private readonly sms;

  constructor(apiKey: string, username: string) {
    const client = AfricasTalking({ apiKey, username });
    this.sms = client.SMS;
  }

  async send(params: NotificationParams): Promise<void> {
    await this.sms.send({
      to:   [params.to],
      message: params.message,
      from: process.env.AT_SENDER_ID,
    });
  }
}
```

Installer le SDK :
```bash
pnpm --filter api add africastalking
pnpm --filter api add -D @types/africastalking
```

### Activer le provider

Dans `apps/api/src/infrastructure/container.ts` :
```typescript
import { AfricasTalkingProvider } from './providers/notification/africastalking';

const smsProvider = process.env.AT_API_KEY
  ? new AfricasTalkingProvider(process.env.AT_API_KEY, process.env.AT_USERNAME!)
  : new StubNotificationProvider();

export const notificationService = new NotificationService(smsProvider, smsProvider);
```

**`apps/api/.env`** :
```env
AT_API_KEY="votre_cle_api"
AT_USERNAME="votre_username"
AT_SENDER_ID="MBOLO"
```

---

## Firebase (Google Services)

### Qu'est-ce que c'est ?

**Firebase Cloud Messaging (FCM)** est le service Google utilisé par Expo pour délivrer les notifications push sur **Android**. Expo s'en charge en arrière-plan — vous n'utilisez pas FCM directement, mais un fichier de configuration est nécessaire pour le build.

### Pourquoi c'est nécessaire

Sans Firebase, les notifications push n'arrivent pas sur Android en production. En développement avec Expo Go, ce n'est pas requis.

### Créer un projet Firebase

1. Aller sur [console.firebase.google.com](https://console.firebase.google.com)
2. **Créer un projet** → nommer `mbolo-sante`
3. **Ajouter une application Android** :
   - Package name : `com.mbolo.sante` (doit correspondre à `app.json`)
4. Télécharger **`google-services.json`**
5. Placer le fichier dans `apps/mobile/google-services.json`

### Configuration

**`apps/mobile/app.json`** :
```json
{
  "expo": {
    "android": {
      "package": "com.mbolo.sante",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

Le fichier `google-services.json` **ne doit pas être commité** dans git (contient des identifiants). L'ajouter à `.gitignore` :
```
apps/mobile/google-services.json
```

Pour le workflow GitHub Actions, l'ajouter comme **secret GitHub** :
1. Copier le contenu de `google-services.json`
2. GitHub → Settings → Secrets → **New secret** → `GOOGLE_SERVICES_JSON`
3. Dans le workflow, écrire le fichier avant le build :
```yaml
- name: Write google-services.json
  run: echo '${{ secrets.GOOGLE_SERVICES_JSON }}' > apps/mobile/google-services.json
```

---

## Récapitulatif des variables d'environnement

### `apps/api/.env` (complet)

```env
# ── Base de données ──────────────────────────────────────────
DATABASE_URL="postgresql://mbolo:mbolo_dev@localhost:5432/mbolo_sante"
REDIS_URL="redis://localhost:6379"

# ── JWT ──────────────────────────────────────────────────────
JWT_SECRET="minimum-32-caracteres-aleatoires"
JWT_EXPIRES_IN="7d"
OTP_TTL_SECONDS=300

# ── Serveur ───────────────────────────────────────────────────
PORT=3000
NODE_ENV=development

# ── MyPVIT (paiement) ─────────────────────────────────────────
# Laisser vide → StubPaymentProvider (simulation)
MYPVIT_BASE_URL="https://api.mypvit.pro/v2"
MYPVIT_URL_CODE=""
MYPVIT_OPERATION_ACCOUNT_CODE=""
MYPVIT_API_PASSWORD=""
MYPVIT_CALLBACK_URL_CODE=""

# ── Expo Push Notifications ───────────────────────────────────
# Laisser vide → StubPushProvider (logs console)
EXPO_ACCESS_TOKEN=""

# ── Daily.co (vidéo) ──────────────────────────────────────────
# Laisser vide → StubVideoProvider (URLs fictives)
DAILY_API_KEY=""

# ── Africa's Talking (SMS) ────────────────────────────────────
# Laisser vide → StubNotificationProvider (logs console)
AT_API_KEY=""
AT_USERNAME=""
AT_SENDER_ID="MBOLO"
```

### `apps/mobile/.env` (complet)

```env
# URL de l'API backend
EXPO_PUBLIC_API_URL="http://localhost:3000"

# Project ID Expo (expo.dev → votre projet → Settings)
# Laisser vide si pas de compte Expo
EXPO_PUBLIC_PROJECT_ID=""
```

---

## Ordre de priorité pour la mise en production

1. **MyPVIT** — bloquant : sans paiement, le modèle économique ne fonctionne pas
2. **Expo + Firebase** — important : les notifications temps réel sont critiques pour la téléconsultation
3. **Daily.co** — important : requis pour les consultations vidéo
4. **Africa's Talking** — recommandé : les OTP en prod (les logs ne suffisent pas)
