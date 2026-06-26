# Référence API — MBOLO Santé

Base URL : `http://localhost:3000` (dev) · `https://api.votre-domaine.com` (prod)

Toutes les réponses suivent le format `{ data: ... }` sauf erreurs.

**Authentification :** Header `Authorization: Bearer <jwt_token>` sur tous les endpoints protégés.

---

## Auth — `/auth`

### `POST /auth/request-otp`
Envoie un code OTP par SMS au numéro fourni.
```json
{ "phone": "241060000000" }
```
```json
{ "data": { "message": "OTP envoyé" } }
```

### `POST /auth/verify-otp`
Vérifie le code OTP et retourne un JWT.
```json
{ "phone": "241060000000", "code": "123456", "name": "Jean Dupont", "role": "patient" }
```
```json
{ "data": { "token": "eyJ...", "user": { "id": "...", "phone": "...", "role": "patient" } } }
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

### `GET /orders` 🔒
- Patient → ses commandes
- Partner staff → commandes de sa pharmacie

### `GET /orders/:id` 🔒

### `POST /orders/:id/action` 🔒 `[partner_staff]`
Faire avancer le statut d'une commande.
```json
{ "action": "accept" }   // pending_pharmacy → pharmacy_accepted
{ "action": "prepare" }  // pharmacy_accepted → preparing
{ "action": "ready" }    // preparing → ready_for_pickup
```

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

### `POST /deliveries/:id/handover` 🔒 `[courier]`
Confirmer la remise au patient avec le code OTP.
```json
{ "code": "A3F9K2" }
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

### `POST /payments/webhook`
Webhook MyPVIT (pas d'auth JWT). Doit répondre immédiatement :
```json
{ "transactionId": "PAY...", "responseCode": 200 }
```

---

## Partenaires — `/partners`

### `GET /partners`
Paramètre optionnel : `type` (`pharmacy` | `kitchen` | `device_supplier` | `transporter`)

### `GET /partners/:id`

### `POST /partners` 🔒 `[admin]`
Créer un partenaire.

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
| 500 | Erreur serveur interne |

Format des erreurs :
```json
{ "error": "Message d'erreur lisible" }
```
