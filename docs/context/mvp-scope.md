# Périmètre MVP — MBOLO Santé

## Activé en MVP

### ✅ Authentification
- Téléphone + OTP SMS
- JWT (7 jours)
- Rôles : patient, partner_staff, courier, doctor, admin

### ✅ Ordonnances médicaments
- Upload scan (JPEG/PNG/WebP/PDF, max 10 Mo)
- Sélection d'une pharmacie cible
- Notification WhatsApp/SMS à la pharmacie
- Validation pharmacien avec saisie des prix
- Création automatique de la commande à la validation
- Ordonnance numérique post-téléconsultation

### ✅ Commandes
- Création automatique (pas de panier manuel)
- Statuts : pending → preparing → ready → dispatched → delivered
- Actions pharmacien : préparer / prêt / refuser
- Notifications patient à chaque étape

### ✅ Livraison
- Auto-assignation par le coursier (pull, pas push)
- Tracking GPS (position mise à jour par le coursier)
- Code de remise (handoverCode) pour confirmer la livraison

### ✅ Paiement
- Escrow mobile money (blocage à la commande)
- Release automatique sur confirmation remise
- Payout vers la pharmacie (commission déduite)
- Tous les tarifs en base (table `pricing`)

### ✅ Téléconsultation
- RDV immédiat (file d'attente médecins disponibles) et planifié
- Vidéo via Daily.co (interface VideoProvider)
- Ordonnance numérique post-consultation
- Frais vidéo récupérés en frais de service (calcul dynamique)
- Vérification médecin : automatique + manuelle admin

### ✅ Notifications
- WhatsApp (prioritaire) avec fallback SMS
- Abstraction NotificationProvider (stub en dev)

---

## Hors périmètre MVP (schéma prévu, code non activé)

### 🔲 Transport médical (`RideRequest`, `Ride`)
- Schéma créé, aucun endpoint exposé
- Activer : créer `domains/rides/` sur le modèle `orders/`

### 🔲 Repas (`MealPlan`, `MealOrder`)
- Schéma créé, aucun endpoint exposé
- Activer : créer `domains/meals/` sur le modèle `orders/`

### 🔲 Ostéosynthèse
- Géré via `PrescriptionType.osteo` (même flow que médicaments)
- Différence : validation plus longue, produits à commander chez `device_supplier`
- Activer : ajouter `device_supplier` comme type de partenaire dans les routes

### 🔲 Application web (dashboard admin / pharmacien)
- Non prévu pour MVP mobile
- L'API est prête — brancher un front React/Next.js ultérieurement

### 🔲 Messagerie in-app (chat)
- Schéma `conversations`/`messages` créé
- Pas de WebSocket pour MVP — prévu phase 2

### 🔲 Avis et notations
- Schéma `reviews` créé (polymorphe)
- Pas d'endpoint pour MVP

---

## Zone géographique MVP

**Libreville uniquement.** Le périmètre de livraison et la liste des pharmacies partenaires sont limités à Libreville au lancement.

## Langue

**Français uniquement.** La structure i18n est préparée (`apps/mobile/src/i18n/`) mais une seule locale est active.

---

## Roadmap technique post-MVP

| Priorité | Feature | Prérequis |
|---|---|---|
| 1 | Provider MeSomb/Campay (paiement réel) | Contrat commercial |
| 2 | Provider Africa's Talking (OTP/SMS réel) | Compte AT |
| 3 | Provider Daily.co (vidéo réel) | Clé API |
| 4 | Transport médical | Partenaires transporteurs |
| 5 | Chat WebSocket (Socket.io) | Infra Redis pub/sub |
| 6 | Dashboard web pharmacien | — |
| 7 | Repas | Partenaires cuisine |
| 8 | Notifications push (Expo) | — |
