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

**Expo** est l'outil qui permet d'écrire l'application MBOLO Santé en JavaScript/TypeScript et de la transformer en vraie application Android (APK) ou iOS. Sans Expo, il faudrait écrire le code deux fois : une fois en Java/Kotlin pour Android, une fois en Swift pour iPhone.

Expo joue trois rôles dans le projet :

1. **Framework de développement** — toute l'application mobile (`apps/mobile`) est écrite avec React Native + Expo. C'est la fondation du projet mobile, sans elle rien ne fonctionne.

2. **Service de build** — Expo peut compiler le code et générer l'APK dans le cloud, sans avoir à installer Android Studio ou Xcode sur son ordinateur. C'est le service EAS (Expo Application Services).

3. **Service de notifications push** — Expo fournit une seule API pour envoyer des notifications sur Android et iOS. Sans ça, il faudrait gérer séparément le système d'Apple (APNs) et celui de Google (FCM), ce qui est nettement plus complexe.

**Analogie** : Expo est comme Adobe InDesign pour les apps mobiles — vous créez votre contenu une seule fois, et vous pouvez l'exporter en version Android et en version iOS sans tout refaire.

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

**MyPVIT** ([mypvit.pro](https://mypvit.pro)) est l'équivalent de Stripe ou PayPal pour le Gabon — mais adapté au mobile money africain. C'est la passerelle qui permet à MBOLO Santé d'encaisser des paiements depuis les portefeuilles mobiles des patients, sans qu'ils aient besoin d'une carte bancaire.

Opérateurs supportés :
- **Airtel Money** (Gabon)
- **Moov Money** (Gabon)

La majorité des Gabonais utilisent le mobile money au quotidien (recharges, factures, transferts) — intégrer MyPVIT permet de toucher ces utilisateurs directement là où est leur argent.

**Comment le paiement se passe concrètement :**

```
Patient appuie sur "Payer"
        ↓
MBOLO Santé envoie la demande à MyPVIT
        ↓
MyPVIT envoie une notification USSD au téléphone du patient
(le patient reçoit un message du type "Confirmez le paiement de 2 000 FCFA à MBOLO Santé")
        ↓
Patient tape son code PIN mobile money
        ↓
MyPVIT confirme le paiement à MBOLO Santé via webhook
        ↓
Consultation débloquée, médecin rémunéré
```

**Analogie** : MyPVIT est comme un terminal de paiement CB, mais pour le mobile money. Quand le patient "tape son code" sur son téléphone, c'est l'équivalent d'insérer sa carte.

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

**Daily.co** ([daily.co](https://daily.co)) est un service de visioconférence programmable — comme Zoom, mais contrôlé par code. Quand un médecin et un patient démarrent une consultation, MBOLO Santé demande automatiquement à Daily.co de créer une salle vidéo privée, génère deux accès séparés (un pour le médecin, un pour le patient), et les envoie à chacun via notification.

La différence avec Zoom ou Google Meet : personne n'a besoin de planifier une réunion ou d'envoyer un lien manuellement. L'application crée la salle en quelques millisecondes, au moment exact où la consultation commence.

**Caractéristiques importantes pour MBOLO Santé :**
- La salle est **privée** (accessible uniquement avec les tokens générés par le serveur)
- La salle **expire automatiquement** à la fin de la consultation prévue
- Maximum 2 participants (patient + médecin) — les autres ne peuvent pas rejoindre
- Aucune donnée vidéo n'est stockée par défaut (conformité données médicales)

**Analogie** : Daily.co est comme une cabine téléphonique qu'on réserve à la demande — elle existe le temps de l'appel, puis disparaît.

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

**Africa's Talking** ([africastalking.com](https://africastalking.com)) est une infrastructure SMS qui permet à une application d'envoyer des messages texte à des numéros de téléphone africains, comme si l'application avait elle-même un téléphone et un abonnement chez tous les opérateurs du continent.

Concrètement, Africa's Talking a signé des accords avec les opérateurs téléphoniques de plus de 20 pays africains (Airtel, MTN, Orange, Moov, etc.). Quand MBOLO Santé demande d'envoyer un SMS à un numéro gabonais, Africa's Talking s'occupe de contacter le bon opérateur et de faire passer le message.

**Ce qu'on l'utilise dans MBOLO Santé :**
- Envoyer les **codes OTP** à la connexion ("Votre code : 847291")
- Envoyer des **alertes SMS** si le patient n'a pas les notifications activées
- Confirmer les rendez-vous par SMS (optionnel)

**Pourquoi pas juste l'email ?** En Afrique, le SMS reste le canal de communication numérique le plus universel. Tout le monde a un numéro de téléphone, pas forcément une adresse email.

**Pourquoi pas envoyer les SMS directement ?** Un serveur ne peut pas envoyer de SMS seul — il faut passer par un opérateur télécom. Africa's Talking est l'intermédiaire qui a ces accords avec les opérateurs.

**Analogie** : Africa's Talking est comme La Poste, mais pour les SMS. Vous lui donnez un message et un numéro de destinataire, il se charge de le livrer en passant par les bons réseaux.

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

**Firebase Cloud Messaging (FCM)** est l'infrastructure de Google qui se charge de **délivrer les notifications push sur les téléphones Android**.

Voici comment les notifications fonctionnent réellement, étape par étape :

```
Serveur MBOLO Santé
        ↓  "Envoie une notif à ce patient"
Expo Push Service
        ↓  Expo identifie que c'est un téléphone Android
Firebase Cloud Messaging (Google)
        ↓  Google contacte directement le téléphone Android du patient
Téléphone Android du patient
        → La notification apparaît à l'écran
```

MBOLO Santé parle uniquement à Expo — c'est Expo qui parle à Firebase, et Firebase qui contacte les téléphones Android. Vous ne gérez pas Firebase directement dans le code, mais son fichier de configuration (`google-services.json`) est nécessaire pour que l'APK puisse recevoir des notifications.

**Pour iOS :** Apple a son propre système équivalent (APNs) qui fonctionne de façon similaire. Expo le gère aussi de son côté.

### Pourquoi c'est nécessaire

Sans Firebase configuré, les notifications push n'arrivent pas sur les téléphones Android en production. Les consultations temps réel (notification "Votre médecin est prêt") nécessitent que ce canal fonctionne.

En développement avec l'application Expo Go sur votre téléphone, ce n'est pas requis — Expo Go a déjà sa propre configuration Firebase.

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
