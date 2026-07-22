# Audit des parcours — MBOLO Santé

> Audit de justesse (autorisations, machines à états, cohérence financière) mené
> parcours par parcours sur le code réel de l'API. Chaque constat « corrigé » est
> accompagné d'un test ou d'une garde vérifiable.

## 1. Bugs corrigés

### 1.1 Fuite de données patient — livraisons (IDOR) · **corrigé**
`GET /deliveries/:id` et `/deliveries/:id/tracking` autorisaient **n'importe quel
coursier** à lire **n'importe quelle livraison** (nom, téléphone et adresse du
patient), y compris une course assignée à un confrère ou déjà livrée.
**Correctif :** un coursier n'accède qu'à une course **encore à prendre**
(`pending_assignment`) ou **assignée à lui-même**. Le patient destinataire reste
autorisé. Test anti-IDOR ajouté (`deliveries/service.test.ts`).

### 1.2 Fuite de données patient — transport (IDOR) · **corrigé**
`GET /rides/:id` appelait `getById(id)` **sans aucun contrôle d'accès** : tout
utilisateur authentifié pouvait lire l'identité du patient et les adresses de
prise en charge/dépose de n'importe quelle course.
**Correctif :** accès réservé au patient demandeur ou au coursier assigné/à
prendre (même règle que les livraisons).

### 1.3 Fuite de données patient — repas (IDOR) · **corrigé**
`GET /meals/orders/:id` appelait `getOrder(id)` sans contrôle : toute commande de
repas d'autrui était lisible.
**Correctif :** accès réservé au patient propriétaire ou à la cuisine
(partenaire) détenant le plan de la commande.

### 1.4 Frais de livraison jamais facturés (perte de revenu) · **corrigé**
La livraison était créée avec son tarif (`feeFcfa`) et **annoncée au patient**
(« Livraison : 1 000 FCFA »), mais le montant réellement débité omettait ce
tarif — aussi bien en **séquestre Mobile Money** (`initEscrow`) qu'en **paiement
à la livraison** (COD). MBOLO ne percevait donc jamais les frais de livraison
pourtant prévus au modèle économique.
**Correctif :** le montant patient inclut désormais
`part médicaments (ticket modérateur) + frais de service + frais de livraison`,
dans les deux modes. Test ajouté (`payments/service.test.ts`).

### 1.5 Tiers-payant CNAMGS calculé sur tout le panier · **corrigé (commit précédent)**
Voir `d703048`. La part caisse était appliquée à l'intégralité du panier ; elle
ne porte désormais que sur les **articles remboursables** (liste CNAMGS), au taux
du **régime** (agent public / privé / GEF ; 80 / 90 / 100 %).

## 2. Parcours vérifiés — conformes (aucune action)

| Parcours | Points vérifiés |
|----------|-----------------|
| **Auth (OTP)** | OTP crypto-sûr, double rate-limit (IP + numéro, 3/15 min), anti-bruteforce à la vérification (3 essais), TTL, suppression à succès. |
| **Ordonnance → commande** | Propriété (officine cible ou téléconsultation), garde d'état `PENDING_VALIDATION` empêchant la double commande, anti-re-délivrance stupéfiant. |
| **Paiement** | Propriété commande/consultation, anti-double escrow, idempotency-key, montant = ticket modérateur + frais. |
| **Livraison / remise** | Code de remise caviardé côté coursier, remise verrouillée tant que l'original stupéfiant n'est pas vérifié, libération escrow idempotente. |
| **Téléconsultation** | RDV patient-ou-médecin, salle d'attente ouverte 10 min avant, démarrage réservé au médecin propriétaire. |
| **Avis** | Éligibilité réelle (commande livrée / consultation terminée), un avis par cible, modération IA non bloquante. |
| **Compte accompagnant** | Accès aux commandes d'un patient conditionné à un lien **accepté** ; accept/revoke contrôlés. |
| **Notifications** | Marquage « lu » réservé au propriétaire. |
| **Annuaire médecins/pharmacies** | Lecture publique légitime — aucun champ sensible (règlement, commission) exposé. |

## 3. Options manquantes proposées (à décider)

1. **Annulation côté prestataire.** L'annulation de RDV est réservée au patient ;
   un médecin ne peut pas décliner une consultation (avec motif), une pharmacie ne
   peut pas annuler une commande déjà acceptée. → Ajouter `decline`/`cancel`
   prestataire avec motif + notification.
2. **Remboursement après paiement.** Aucun flux de remboursement/avoir si une
   commande payée (séquestre) est annulée côté pharmacie. → Ajouter un
   `refundEscrow` déclenché sur refus/annulation post-paiement.
3. **Durcissement salle vidéo.** `guestVideoUrl` renvoie l'URL brute de la room ;
   le `guestToken` existe mais n'est pas utilisé. → Émettre une URL à portée de
   token invité pour éviter tout accès par simple partage du lien.
4. **Bordereau tiers-payant exportable.** Les créances part-caisse par organisme
   existent en API (`/orders/partner/insurance-claims`) ; les exposer en
   **export CSV/PDF** pour le dépôt CNAMGS de l'officine.
5. **Plafond d'espèces coursier (COD).** Le modèle de risque prévoit un plafond de
   cash par livreur avec reversement quotidien — non appliqué dans le code. →
   Ajouter un plafond configurable + blocage de nouvelles courses COD au-delà.
6. **Préférences de notification.** Permettre au patient de choisir ses canaux
   (push / SMS / WhatsApp) et de se désabonner du non-transactionnel.
