# Référence API — MBOLO Santé

Base URL : `http://localhost:3000` (dev) · `https://api.votre-domaine.com` (prod)

Toutes les réponses suivent le format `{ data: ... }` sauf erreurs.

**Authentification :** Header `Authorization: Bearer <jwt_token>` sur tous les endpoints protégés.

---

## Auth — `/auth`

> **Rate-limiting** (Redis) : `POST /auth/otp/request` est limité à 10 req/15 min
> par IP et 3 req/15 min par numéro ; `POST /auth/otp/verify` à 20 req/15 min par
> IP. Dépassement → `429` avec en-tête `Retry-After`.

### `POST /auth/otp/request`
Envoie un code OTP par SMS au numéro fourni.
```json
{ "phone": "241060000000" }
```
```json
{ "expiresIn": 300 }
```

### `POST /auth/otp/verify`
Vérifie le code OTP et retourne un JWT.
```json
{ "phone": "241060000000", "code": "123456" }
```
```json
{ "token": "eyJ...", "user": { "id": "...", "phone": "...", "role": "patient", "name": "Jean Dupont" } }
```

---

## Utilisateurs — `/users`

### `GET /users/me` 🔒
Profil de l'utilisateur connecté.

### `PATCH /users/me` 🔒
```json
{ "name": "Nouveau nom" }
```

### `POST /users/me/push-token` 🔒
Enregistrer le token Expo Push (appelé automatiquement par le mobile au démarrage).
```json
{ "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxx]" }
```
```json
{ "data": { "saved": true } }
```

---

## Médecins — `/doctors`

### `GET /doctors`
Liste des médecins. Paramètres :
- `specialty` (string) — filtrer par spécialité
- `availableNow` (boolean) — uniquement les disponibles en ce moment

### `GET /doctors/:id`
Fiche d'un médecin.

### `GET /doctors/:id/slots?date=YYYY-MM-DD`
Créneaux de 30 min disponibles pour un médecin à une date donnée.
```json
{
  "data": [
    { "datetime": "2026-06-24T08:00:00.000Z", "available": true },
    { "datetime": "2026-06-24T08:30:00.000Z", "available": false }
  ]
}
```

### `POST /doctors/register` 🔒
Inscription d'un nouveau médecin.
```json
{
  "cnomNumber": "CNOM-12345",
  "specialtyId": "cuid_specialty",
  "consultationFeeFcfa": 10000,
  "bio": "Médecin généraliste avec 10 ans d'expérience",
  "languages": ["fr"]
}
```

### `PATCH /doctors/me/availability` 🔒 `[doctor]`
```json
{ "isAvailableNow": true }
```

---

## Rendez-vous — `/appointments`

### `GET /appointments` 🔒
- Rôle **patient** → ses propres rendez-vous
- Rôle **médecin** → sa file de consultations

### `GET /appointments/:id` 🔒
Détail d'un rendez-vous (patient ou médecin concerné uniquement).

Réponse inclut : doctor, patient, consultation (notes, durée, frais, ordonnance, transaction).

### `POST /appointments` 🔒
Créer un rendez-vous.

Consultation **immédiate** :
```json
{
  "type": "immediate",
  "chiefComplaint": "Fièvre depuis 3 jours"
}
```

Consultation **programmée** :
```json
{
  "type": "scheduled",
  "doctorId": "cuid_doctor",
  "scheduledAt": "2026-06-25T10:00:00.000Z",
  "chiefComplaint": "Suivi tension artérielle"
}
```

### `POST /appointments/:id/start` 🔒 `[doctor]`
Démarre la session vidéo. Retourne les tokens vidéo.
```json
{
  "data": {
    "id": "...",
    "hostVideoUrl": "https://mbolo.daily.co/...",
    "guestVideoUrl": "https://mbolo.daily.co/..."
  }
}
```

### `POST /appointments/:id/complete` 🔒 `[doctor]`
Clôture la consultation.
```json
{
  "notes": "Patient fiévreux. Prescription d'amoxicilline.",
  "prescription": "Amoxicilline 500mg — 3x/jour pendant 7 jours"
}
```
```json
{
  "data": {
    "durationSeconds": 1200,
    "durationMin": 20,
    "videoFeeFcfa": 713,
    "serviceFeeFcfa": 10713,
    "prescription": { "id": "...", "notes": "..." }
  }
}
```

### `PATCH /appointments/:id/cancel` 🔒 `[patient]`
Annuler un rendez-vous (impossible si statut `in_progress`).

---

## Ordonnances — `/prescriptions`

### `GET /prescriptions` 🔒
- Rôle **patient** → ses ordonnances
- Rôle **partner_staff** → les ordonnances de sa pharmacie

### `GET /prescriptions/:id` 🔒

### `POST /prescriptions` 🔒 `[patient]`
Upload d'une ordonnance (multipart/form-data).
- `file` : image ou PDF
- `targetPartnerId` : ID de la pharmacie choisie
- `type` : `drug` ou `osteo`

### `POST /prescriptions/:id/validate` 🔒 `[partner_staff]`
Valider une ordonnance et définir les items.
```json
{
  "items": [
    { "name": "Amoxicilline 500mg", "quantity": 21, "unitPriceFcfa": 150 },
    { "name": "Paracétamol 1g", "quantity": 10, "unitPriceFcfa": 100 }
  ]
}
```

### `POST /prescriptions/:id/reject` 🔒 `[partner_staff]`
```json
{ "reason": "Ordonnance illisible — merci de retransmettre" }
```

---

## Commandes — `/orders`

### `GET /orders` 🔒 `[patient]`
Les commandes du patient connecté.

### `GET /orders/partner/list` 🔒 `[partner_staff]`
Les commandes de l'officine du staff connecté.

### `GET /orders/:id` 🔒 `[patient]`

### `PATCH /orders/:id/pharmacy-action` 🔒 `[partner_staff]`
Faire avancer le statut d'une commande.
```json
{ "action": "prepare" }                          // pending_pharmacy | pharmacy_accepted → preparing
{ "action": "ready" }                            // preparing → ready_for_pickup
{ "action": "reject", "reason": "Rupture de stock" } // → pharmacy_rejected
```
> `reject` (et l'annulation quand le patient refuse tous les équivalents proposés)
> **rend automatiquement au patient son séquestre** : la transaction passe en
> `refunded` et l'argent bloqué lui est restitué (jamais versé à la plateforme
> ni à l'officine). Sans médicament dispensé, aucune somme n'est retenue.

---

## Livraisons — `/deliveries`

### `GET /deliveries` 🔒
- Livreur → ses livraisons

### `GET /deliveries/:id` 🔒

### `PATCH /deliveries/:id/position` 🔒 `[courier]`
Mettre à jour la position GPS.
```json
{ "lat": 0.3924, "lng": 9.4536 }
```

### `POST /deliveries/:id/handover` 🔒
Le patient confirme la réception avec le code de remise. Déclenche la libération
de l'escrow et le versement (pharmacie / cuisine selon le type de livraison).
```json
{ "code": "A3F9K2" }
```

### `GET /deliveries/me/availability` 🔒 `[courier]`
Disponibilité actuelle du livreur.
```json
{ "data": { "isAvailable": true } }
```

### `PATCH /deliveries/me/availability` 🔒 `[courier]`
```json
{ "isAvailable": true }
```

---

## Transport médical — `/rides`

### `POST /rides/estimate` 🔒 `[patient]`
Estime distance et tarif avant la demande (utilisé pour l'aperçu en direct).
```json
{ "originLat": 0.3924, "originLng": 9.4536, "destLat": 0.4014, "destLng": 9.4536 }
```
```json
{ "data": { "distanceKm": 1.0, "fareEstFcfa": 1700, "baseFee": 1500, "perKm": 200 } }
```

### `POST /rides` 🔒 `[patient]`
Crée une demande de transport (génère la course + la livraison associée).
```json
{
  "type": "hospital",
  "originLat": 0.3924, "originLng": 9.4536, "originLandmark": "Hôpital Owendo",
  "destLat": 0.4014,  "destLng": 9.4536,  "destLandmark": "Quartier Louis",
  "notes": "Patient à mobilité réduite"
}
```
`type` : `home` | `hospital` | `exam`

### `GET /rides/mine` 🔒 `[patient]`
Mes demandes de transport (avec la course liée).

### `GET /rides/available` 🔒 `[courier]`
Courses en attente de chauffeur.

### `GET /rides/courier/mine` 🔒 `[courier]`
Mes courses acceptées.

### `GET /rides/:id` 🔒
Détail d'une course.

### `PATCH /rides/:id/accept` 🔒 `[courier]`
Accepte une course (assigne le chauffeur + la livraison).

### `PATCH /rides/:id/status` 🔒 `[courier]`
Fait avancer la course. À `completed`, libère l'escrow et verse le chauffeur.
```json
{ "status": "en_route" }
```
`status` : `en_route` | `arrived` | `completed` | `cancelled`

---

## Repas & nutrition — `/meals`

### `GET /meals/plans` 🔒
Menus actifs. Paramètre optionnel : `partnerId`.

### `GET /meals/plans/:id` 🔒
Détail d'un menu (avec ses articles).

### `POST /meals/plans` 🔒 `[partner_staff]`
Crée un menu.
```json
{
  "name": "Menu diabétique",
  "description": "Faible en sucre",
  "items": [{ "name": "Poisson grillé + légumes", "unitPriceFcfa": 3500 }]
}
```

### `PATCH /meals/plans/items/:itemId/availability` 🔒 `[partner_staff]`
```json
{ "isAvailable": false }
```

### `POST /meals/orders` 🔒 `[patient]`
Passe une commande repas (crée la livraison associée).
```json
{ "mealPlanId": "cuid_plan", "notes": "Sans piment" }
```

### `GET /meals/orders/mine` 🔒 `[patient]`
### `GET /meals/orders/kitchen` 🔒 `[partner_staff]`
### `GET /meals/orders/:id` 🔒

---

## Messagerie — `/chat`

> **Autorisation** : seuls les participants de l'entité référencée (et les
> admins) peuvent accéder à une conversation. `appointment` → patient + médecin,
> `order` → patient + staff pharmacie, `delivery` → patient + coursier.

### `POST /chat/conversations` 🔒
Récupère ou crée une conversation pour une entité.
```json
{ "refTable": "appointment", "refId": "cuid_appointment" }
```

### `GET /chat/conversations/:id/messages` 🔒
Liste les messages. Paramètre optionnel `after` (ISO date) pour le polling
incrémental.

### `POST /chat/conversations/:id/messages` 🔒
```json
{ "body": "Bonjour docteur" }
```

---

## Paiements — `/payments`

### `POST /payments/escrow` 🔒 `[patient]`
Initier le paiement d'une commande.
```json
{
  "orderId": "cuid_order",
  "phoneNumber": "241070000000"
}
```

### `POST /payments/consultation` 🔒 `[patient]`
Initier le paiement d'une consultation.
```json
{
  "consultationId": "cuid_consultation",
  "phoneNumber": "241070000000",
  "operator": "airtel"
}
```
`operator` : `"airtel"` | `"moov"`

### `GET /payments/consultation/:consultationId/status` 🔒 `[patient]`
Polling du statut du paiement.
```json
{
  "data": {
    "consultationId": "...",
    "amountFcfa": 10713,
    "transaction": {
      "id": "...",
      "status": "captured",
      "paidAt": "2026-06-24T15:30:00.000Z"
    }
  }
}
```
`status` : `pending` | `captured` | `failed`

### `POST /payments/ride` 🔒 `[patient]`
Initie le paiement (escrow) d'une course.
```json
{ "rideId": "cuid_ride", "phoneNumber": "241070000000", "operator": "airtel" }
```

### `GET /payments/ride/:rideId/status` 🔒 `[patient]`
Polling du statut (`pending` | `captured` | `failed`).

### `POST /payments/meal` 🔒 `[patient]`
Initie le paiement (escrow) d'une commande repas.
```json
{ "mealOrderId": "cuid_meal_order", "phoneNumber": "241070000000", "operator": "airtel" }
```

### `GET /payments/meal/:mealOrderId/status` 🔒 `[patient]`
Polling du statut (`pending` | `captured` | `failed`).

### `POST /payments/webhook`
Webhook MyPVIT (pas d'auth JWT). Protégé par secret partagé si
`MYPVIT_WEBHOOK_SECRET` est défini — à fournir en query `?secret=...` (inclus
dans l'URL de callback enregistrée) ou en en-tête `x-webhook-secret`, sinon `401`.
Doit répondre immédiatement :
```json
{ "transactionId": "PAY...", "responseCode": 200 }
```

---

## Administration — `/admin` 🔒 `[admin]`

Toutes les routes exigent le rôle `admin`.

| Endpoint | Description |
|----------|-------------|
| `GET /admin/stats` | Compteurs globaux (commandes, livraisons, courses, repas, RDV, users, médecins) |
| `GET /admin/orders` | Commandes (filtre `status`) |
| `GET /admin/deliveries` | Livraisons (commande / course / repas) |
| `GET /admin/rides` | Courses |
| `GET /admin/meals` | Commandes repas |
| `GET /admin/doctors` | Médecins + statut de vérification |
| `GET /admin/users` | Utilisateurs (filtre `role`) |
| `GET /admin/partners` | Partenaires |
| `PATCH /admin/...` | Activer/désactiver une entité |

---

## Santé — `/health`

### `GET /health`
Liveness — toujours `200` si le process répond.
```json
{ "status": "ok", "timestamp": "..." }
```

### `GET /health/ready`
Readiness — vérifie PostgreSQL et Redis. `503` si une dépendance est indisponible.
```json
{ "status": "ready", "checks": { "database": true, "redis": true }, "timestamp": "..." }
```

---

## Partenaires — `/partners`

### `GET /partners`
Paramètre optionnel : `type` (`pharmacy` | `kitchen` | `device_supplier` | `transporter`).
Renvoie aussi `rating` (moyenne, avis non signalés) + `reviewCount`, `isOnDuty`, `openingHours`.

### `GET /partners/:id`

### `POST /partners` 🔒 `[admin]`
Créer un partenaire.

---

## Avis — `/reviews`

| Endpoint | Rôle | Description |
|----------|------|-------------|
| `GET /reviews/summary?refTable=&refId=` 🔒 | tous | Note moyenne + avis récents (signalés exclus) |
| `POST /reviews` 🔒 | patient | Noter un service réellement utilisé ; le commentaire est modéré par IA (`claude-haiku-4-5`), un avis douteux est `flagged` |
| `GET /reviews/flagged` 🔒 `[admin]` | admin | File des avis signalés |
| `PATCH /reviews/:id/moderate` 🔒 `[admin]` | admin | `{ action: 'approve' \| 'remove' }` |

## Compte accompagnant — `/care-links`

| Endpoint | Rôle | Description |
|----------|------|-------------|
| `GET /care-links` 🔒 | tous | Mes aidants + comptes que je gère |
| `POST /care-links` 🔒 `[patient]` | patient | Inviter un accompagnant par téléphone |
| `PATCH /care-links/:id/accept` 🔒 `[accompagnant]` | accompagnant | Accepter une invitation |
| `PATCH /care-links/:id/revoke` 🔒 | patient/accompagnant | Rompre le lien |
| `GET /care-links/patients/:patientId/orders` 🔒 `[accompagnant]` | accompagnant | Commandes d'un patient géré (lien accepté requis) |

## Rappels de prise — `/reminders` 🔒 `[patient]`

| Endpoint | Description |
|----------|-------------|
| `POST /reminders/parse` | Posologie en texte libre → horaires proposés (`claude-haiku-4-5`) |

> Les rappels eux-mêmes restent **locaux à l'appareil** (confidentialité) — seul le service de lecture de posologie est côté serveur.

## Suivi de livraison — `/deliveries/:id/tracking` 🔒
Dernière position GPS du coursier (patient destinataire ou coursier).

## KYC — `/kyc`

| Endpoint | Rôle | Description |
|----------|------|-------------|
| `POST /kyc/document` 🔒 | partenaire/médecin/coursier | Déposer un justificatif (multipart) |
| `GET /kyc/verifications` 🔒 `[admin]` | admin | File des profils en attente + justificatifs |
| `POST /kyc/verifications/:type/:id/screen` 🔒 `[admin]` | admin | Pré-contrôle IA vision (`claude-opus-4-8`) |
| `PATCH /kyc/verifications/:type/:id` 🔒 `[admin]` | admin | `{ status: 'verified' \| 'rejected' }` |

## Notifications — `/notifications` 🔒

| Endpoint | Description |
|----------|-------------|
| `GET /notifications` | 50 dernières |
| `GET /notifications/unread-count` | Compteur non-lues |
| `PATCH /notifications/:id/read` · `PATCH /notifications/read-all` | Marquer lu(es) |

---

## Codes d'erreur

| Code HTTP | Signification |
|-----------|--------------|
| 400 | Données invalides (erreur Zod) |
| 401 | Token JWT manquant ou expiré |
| 403 | Accès refusé (rôle insuffisant ou ressource d'un autre user) |
| 404 | Ressource introuvable |
| 409 | Conflit (doublon, déjà existant) |
| 422 | Opération impossible dans l'état actuel |
| 429 | Trop de requêtes (rate-limiting) — voir en-tête `Retry-After` |
| 500 | Erreur serveur interne |

Format des erreurs :
```json
{ "code": "NOT_FOUND", "message": "Message d'erreur lisible" }
```
Les erreurs de validation Zod renvoient `{ "code": "VALIDATION_ERROR", "errors": { ... } }`.
