# Guide d'utilisation — MBOLO Santé

Ce guide décrit les parcours complets pour chaque rôle de la plateforme.

---

## Sommaire

- [Patient](#patient)
- [Médecin](#médecin)
- [Pharmacien](#pharmacien)
- [Livreur](#livreur)

---

## Patient

### 1. Inscription et connexion

1. Ouvrir l'application → écran **Connexion**
2. Saisir son numéro de téléphone gabonais (ex. `241 06 XX XX XX`)
3. Recevoir un **code OTP par SMS** (valable 5 minutes)
4. Saisir le code → accès au tableau de bord patient

> Le numéro de téléphone est l'identifiant unique — pas de mot de passe.

---

### 2. Déposer une ordonnance

**Chemin :** Onglet 📋 Ordonnances → bouton **+**

1. Choisir la source :
   - **Appareil photo** → photographier l'ordonnance papier
   - **Galerie** → sélectionner une photo existante
   - **Fichier** → importer un PDF
2. Sélectionner la **pharmacie partenaire** où la faire préparer
3. Appuyer sur **Envoyer**

L'ordonnance passe en statut **En attente de validation** — le pharmacien reçoit une alerte.

**Suivi des statuts :**
| Statut | Signification |
|--------|---------------|
| En attente | Transmise au pharmacien, en cours d'examen |
| Validée | Pharmacien a accepté, prix défini |
| Rejetée | Ordonnance refusée (voir motif) |
| Préparée | Médicaments prêts à être livrés |
| Complète | Livraison effectuée |

---

### 3. Suivre une commande

**Chemin :** Onglet 📦 Commandes

- **En cours** : commandes actives avec statut en temps réel
- **Terminées** : historique des commandes livrées
- **Annulées** : commandes annulées avec motif

Payer la commande une fois la pharmacie prête :
1. Appuyer sur **Payer**
2. Choisir l'opérateur (**Airtel Money** ou **Moov Money**)
3. Saisir le numéro de téléphone associé au compte mobile money
4. Accepter la demande de paiement sur le téléphone
5. Confirmation automatique — le livreur est ensuite assigné

---

### 4. Consulter un médecin

**Chemin :** Onglet 🩺 Médecins → **Consulter**

#### Consultation immédiate ⚡

1. Appuyer sur **Consultation immédiate**
2. Décrire brièvement le motif de consultation
3. Appuyer sur **Trouver un médecin disponible**
4. Le premier médecin disponible reçoit la demande
5. Attendre la notification **"Votre médecin est prêt"** → rejoindre la vidéo

#### Consultation programmée 📅

1. Appuyer sur **Programmer un rendez-vous**
2. Choisir la spécialité médicale
3. Sélectionner un médecin → voir ses créneaux disponibles
4. Choisir une date et un horaire
5. Décrire le motif
6. Confirmer → le médecin reçoit une notification

#### Pendant la consultation

- La vidéo s'ouvre automatiquement dès que le médecin démarre
- En cas d'ordonnance : elle apparaît dans l'onglet 📋 dès la fin de la consultation (statut **En attente de validation pharmacien**)

#### Après la consultation

1. Recevoir la notification **"Consultation terminée"** avec le montant
2. Ouvrir la fiche du rendez-vous → appuyer sur **Payer maintenant**
3. Choisir l'opérateur (Airtel Money / Moov Money)
4. Saisir le numéro → confirmer sur le téléphone

---

## Médecin

### 1. Inscription et vérification

1. Connexion avec numéro de téléphone + OTP
2. Remplir le profil médecin :
   - Numéro CNOM (Conseil National de l'Ordre des Médecins du Gabon)
   - Spécialité
   - Langues parlées
   - Honoraires de consultation (FCFA)
   - Biographie
3. Attendre la **vérification manuelle** par l'équipe MBOLO (statut `pending_verification → verified`)

> Seuls les médecins vérifiés (`verified`) apparaissent dans les résultats de recherche et peuvent recevoir des rendez-vous.

---

### 2. Gérer sa disponibilité

**Chemin :** Onglet 🏠 Accueil → interrupteur **Disponible maintenant**

- **Activé** (vert) : le médecin apparaît dans les résultats de consultation immédiate
- **Désactivé** : le médecin n'est pas sollicité pour les consultations immédiates

Pour les consultations programmées, configurer les créneaux de disponibilité (admin → à venir).

---

### 3. Gérer les rendez-vous

**Chemin :** Onglet 🩺 Rendez-vous

- **File immédiate** : patients en attente de consultation immédiate
- **Programmées** : rendez-vous planifiés avec date et heure
- **Terminées** : historique des consultations

#### Démarrer une consultation

1. Appuyer sur le rendez-vous → **Démarrer la consultation**
2. La session vidéo s'ouvre automatiquement
3. Le patient reçoit une notification push et peut rejoindre

#### Clôturer une consultation

1. Appuyer sur **Terminer la consultation**
2. Remplir les **notes cliniques** (obligatoires)
3. Rédiger une **ordonnance** si nécessaire (texte libre → transmis au pharmacien)
4. Appuyer sur **Valider**

Les frais de consultation sont calculés automatiquement (base + frais vidéo) et présentés au patient pour paiement.

---

### 4. Recevoir le paiement

Après paiement du patient via MyPVIT :
- Notification push : **"💰 Paiement reçu — X FCFA crédités"**
- Le versement est effectué automatiquement sur le numéro Airtel Money/Moov Money associé au profil
- Commission MBOLO déduite automatiquement (15% par défaut, configurable dans `pricing`)

---

## Pharmacien

### 1. Connexion

Le compte pharmacien est créé par l'administrateur et associé à un profil de pharmacie partenaire. Connexion via numéro de téléphone + OTP.

---

### 2. Valider une ordonnance

**Chemin :** Onglet 📋 Ordonnances → filtre **À valider**

1. Ouvrir l'ordonnance → voir le scan transmis par le patient
2. **Valider** :
   - Saisir chaque médicament : nom, quantité, prix unitaire
   - Le total se calcule automatiquement
   - Appuyer sur **Valider l'ordonnance**
3. **Refuser** (si ordonnance illisible, falsifiée ou non applicable) :
   - Appuyer sur **Refuser**
   - Saisir le motif (visible par le patient)

> Le patient est notifié immédiatement du résultat.

---

### 3. Préparer les commandes

**Chemin :** Onglet 📦 Commandes

Une fois l'ordonnance validée et le patient ayant payé :

1. Commande en statut **À préparer** → appuyer sur **Commencer la préparation**
2. Préparer les médicaments
3. Appuyer sur **Prêt pour livraison** → un livreur disponible est assigné automatiquement

---

## Livreur

### 1. Connexion et disponibilité

Connexion via numéro de téléphone + OTP. Le statut de disponibilité est géré automatiquement.

---

### 2. Prendre en charge une livraison

**Chemin :** Onglet 🚚 Livraisons → filtre **Disponibles**

1. Voir les livraisons disponibles avec l'itinéraire (pharmacie → patient)
2. Appuyer sur **Accepter**
3. Se rendre à la pharmacie → appuyer sur **Récupéré** (statut `picked_up`)
4. Livrer au patient → **Confirmer la livraison**

#### Confirmation par code OTP

À la livraison, le patient communique son **code de remise à 6 chiffres** (visible dans la fiche commande). Le livreur saisit ce code pour confirmer la livraison — cela déclenche la libération de l'escrow (paiement libéré à la pharmacie).

---

### 3. Suivi GPS

La position du livreur est mise à jour en temps réel (toutes les 30 secondes) et visible par le patient sur sa commande.

---

## Codes de statut communs

### Ordonnance (`PrescriptionStatus`)
`pending_validation` → `validated` → `partially_filled` → `filled`
ou `rejected`

### Commande (`OrderStatus`)
`pending_pharmacy` → `pharmacy_accepted` → `preparing` → `ready_for_pickup` → `dispatched` → `delivered`
ou `pharmacy_rejected` / `cancelled`

### Livraison (`DeliveryStatus`)
`pending_assignment` → `assigned` → `en_route_pickup` → `picked_up` → `en_route_delivery` → `delivered`

### Consultation (`ConsultationStatus`)
`waiting_room` → `in_progress` → `completed`

### Paiement (`TransactionStatus`)
`pending` → `held` → `captured` → `released`
ou `failed`
