# Glossaire métier — MBOLO Santé

> Termes utilisés dans le code, les messages et les interfaces. Tout développeur doit maîtriser ce vocabulaire avant de toucher au code métier.

---

## Acteurs

| Terme | Code (`UserRole`) | Définition |
|---|---|---|
| **Patient** | `patient` | Bénéficiaire des soins. Peut être accompagné. |
| **Accompagnant** | `accompagnant` | Personne qui gère les commandes pour le compte d'un patient (aidant, famille). |
| **Pharmacien / Staff officine** | `partner_staff` | Membre du personnel d'une pharmacie partenaire. Valide les ordonnances. |
| **Médecin** | `doctor` | Professionnel de santé vérifié (N° CNOM). Réalise les téléconsultations. |
| **Livreur** | `courier` | Coursier indépendant mandaté par la plateforme (jamais par l'officine). |
| **Admin** | `admin` | Opérateur MBOLO. Vérifie les médecins, gère les tarifs, supervise. |

---

## Entités clés

### Ordonnance (`Prescription`)

Document médical autorisant la délivrance d'un médicament. Sur MBOLO :
- Peut être un **scan** (photo uploadée par le patient) → `source: manual`
- Ou une **ordonnance numérique** générée par un médecin post-téléconsultation → `source: teleconsultation`

**⚠ Contrainte légale :** toute prescription doit passer par `pharmacist_validation` avant qu'une commande puisse être créée. La validation médicale (médecin) et la validation de dispensation (pharmacien) sont deux actes distincts.

### Commande (`Order`)

Créée automatiquement par le système lors de la validation de l'ordonnance par le pharmacien. **Un order = une pharmacie.** Une prescription peut générer plusieurs orders (si le patient sélectionne plusieurs pharmacies).

### Livraison (`Delivery`)

Entité polymorphe : peut porter un `Order` (médicaments), un `Ride` (transport) ou un `MealOrder` (repas). Une seule livraison par entité. Le coursier est assigné via auto-assignation (`/deliveries/:id/assign`).

### Code de remise (`handoverCode`)

Code court généré à la création de la livraison. Le patient communique ce code au livreur lors de la remise physique. Sa saisie par l'API déclenche le release de l'escrow. **Ne jamais l'afficher avant l'arrivée du livreur.**

### Escrow

Mécanisme de paiement sécurisé : le montant est bloqué chez le provider mobile money au moment de la commande et libéré vers la pharmacie uniquement après confirmation de la remise (handoverCode). Protège à la fois le patient et la pharmacie.

### Payout

Virement vers la pharmacie post-livraison. Montant = `totalFcfa × (1 - platform_commission_pct)`. Les frais de service et de livraison restent à MBOLO.

---

## Flux médicaments (résumé)

```
PENDING_VALIDATION → VALIDATED (par pharmacien)
                          ↓ (auto)
                     Order: PENDING_PHARMACY
                          ↓ (pharmacien prépare)
                     Order: PREPARING
                          ↓ (prêt)
                     Order: READY_FOR_PICKUP
                          ↓ (courier assigné)
                     Order: DISPATCHED / Delivery: ASSIGNED
                          ↓ (remise + code)
                     Order: DELIVERED / Delivery: DELIVERED
                          ↓ (auto)
                     Escrow: RELEASED → Payout pharmacie
```

---

## Tarification

Tous les tarifs sont dans la table `Pricing` (jamais en dur). Entrées clés :

| `PricingKind` | Description |
|---|---|
| `service_fee` | Frais de service MBOLO par commande (FCFA) |
| `delivery_base` | Frais fixe de livraison (FCFA) |
| `delivery_per_km` | Supplément par km (FCFA) |
| `consultation_base_fee` | Frais fixes de téléconsultation (FCFA) |
| `video_usd_per_participant_min` | Coût Daily.co (USD, 2 participants) |
| `usd_to_fcfa_rate` | Taux de change pour convertir le coût vidéo en FCFA |
| `platform_commission_pct` | % des honoraires médecin reversé à MBOLO |

---

## Abréviations dans le code

| Abréviation | Sens complet |
|---|---|
| `rx` | Prescription (abréviation médicale universelle) |
| `txn` | Transaction |
| `fcfa` / `Fcfa` | Franc CFA (devise, entier, pas de centimes) |
| `notif` | NotificationService |
| `partnerId` | ID d'un `PartnerProfile` (pharmacie, cuisine, etc.) |
| `courierId` | `User.id` d'un utilisateur avec `role = courier` |
| `doctorId` | `DoctorProfile.id` (pas `User.id`) |
