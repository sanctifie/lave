# Architecture de MBOLO Santé — Vue d'ensemble

Ce document explique **comment la plateforme est construite**, à quoi sert chaque partie, et comment elles s'articulent entre elles. Pas besoin d'être développeur pour comprendre.

---

## Une seule application pour tous les rôles

**Oui, c'est une seule et même application Android** (un seul fichier APK). Il n'y a pas une application pour les patients, une autre pour les médecins, une autre pour les pharmaciens.

### Comment ça fonctionne

Quand un utilisateur se connecte avec son numéro de téléphone, le système sait quel rôle il a. L'application affiche alors **l'interface correspondante à ce rôle** :

| Rôle | Ce que voit l'utilisateur |
|------|--------------------------|
| **Patient** | Tableau de bord, ordonnances, commandes, consultations |
| **Médecin** | File de patients, rendez-vous, historique |
| **Pharmacien** | Ordonnances à valider, commandes à préparer |
| **Livreur** | Livraisons disponibles, carte GPS |

L'application détecte le rôle automatiquement — l'utilisateur n'a rien à configurer. Si le même téléphone change de compte, il verra l'interface du nouveau compte.

### Pourquoi une seule app ?

- Le patient télécharge une seule APK sur Android
- Pas de confusion ("quelle application je dois installer ?")
- Mises à jour simples : tout le monde reçoit la même mise à jour

---

## Les trois parties du système

```
┌─────────────────────────────────────────────────────────────────┐
│                     TÉLÉPHONE ANDROID                           │
│                                                                 │
│   ┌──────────────────────────────────────────────────────┐     │
│   │            APPLICATION MOBILE (APK)                  │     │
│   │                                                      │     │
│   │  Interface patient  │  Interface médecin             │     │
│   │  Interface pharma   │  Interface livreur             │     │
│   │                                                      │     │
│   │  → affiche les données                               │     │
│   │  → envoie les actions de l'utilisateur               │     │
│   └────────────────────┬─────────────────────────────────┘     │
└────────────────────────│────────────────────────────────────────┘
                         │ Internet (HTTPS)
                         │ Requêtes / Réponses
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVEUR (BACKEND)                         │
│                                                                 │
│   ┌──────────────────────────────────────────────────────┐     │
│   │                  API REST                            │     │
│   │                                                      │     │
│   │  Reçoit les demandes de l'app mobile                 │     │
│   │  Vérifie les droits (qui peut faire quoi)            │     │
│   │  Applique les règles métier                          │     │
│   │  Renvoie les données à l'app                         │     │
│   └───────────────┬──────────────────────────────────────┘     │
│                   │                                             │
│   ┌───────────────▼──────────────────────────────────────┐     │
│   │              BASE DE DONNÉES (PostgreSQL)            │     │
│   │                                                      │     │
│   │  Stocke toutes les données de façon permanente :     │     │
│   │  utilisateurs, ordonnances, rendez-vous,             │     │
│   │  transactions, livraisons…                           │     │
│   └──────────────────────────────────────────────────────┘     │
│                                                                 │
│   ┌──────────────────────────────────────────────────────┐     │
│   │              CACHE REDIS                            │     │
│   │                                                      │     │
│   │  Stockage temporaire : codes OTP (5 min),           │     │
│   │  sessions, données souvent consultées                │     │
│   └──────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Le backend — c'est quoi exactement ?

Le **backend** (ou serveur) est le **cerveau de la plateforme**. C'est un programme qui tourne en continu sur un serveur dans le cloud — invisible pour l'utilisateur, mais indispensable.

### Ce qu'il fait

**1. Reçoit les demandes de l'app mobile**

Quand un patient appuie sur "Trouver un médecin", son téléphone envoie une demande au serveur (via Internet). Le serveur traite cette demande et répond. L'app affiche ensuite le résultat.

**2. Vérifie qui a le droit de faire quoi**

Un patient ne peut pas valider une ordonnance — c'est le rôle du pharmacien. Un livreur ne peut pas voir les consultations. Le serveur vérifie chaque action avant de l'exécuter.

**3. Applique les règles métier**

- Un médecin non vérifié ne peut pas recevoir de patients
- On ne peut pas annuler un rendez-vous en cours
- La commission MBOLO est déduite automatiquement à chaque paiement
- Le livreur doit saisir le code OTP du patient pour confirmer la remise

**4. Coordonne tous les acteurs**

Quand un patient paie une consultation, le serveur :
1. Enregistre le paiement
2. Notifie le médecin
3. Programme le versement vers le médecin (moins la commission)

C'est le serveur qui "orchestre" tout — l'app mobile ne fait qu'afficher et envoyer des actions.

### Ce qu'il n'est pas

Le serveur n'est **pas** l'application mobile. Si l'application affiche une erreur "Impossible de se connecter", c'est que l'app ne peut pas joindre le serveur (problème réseau ou serveur arrêté).

---

## Comment les parties communiquent

```
PATIENT                    SERVEUR                   MÉDECIN
   │                          │                          │
   │  "Je veux consulter"     │                          │
   │─────────────────────────►│                          │
   │                          │  Cherche médecin dispo   │
   │                          │  Crée le rendez-vous     │
   │                          │  Notifie le médecin      │
   │                          │─────────────────────────►│
   │  "RDV créé, attendez"    │                    🔔 Notification
   │◄─────────────────────────│                          │
   │                          │                          │
   │                          │   "Je démarre"           │
   │                          │◄─────────────────────────│
   │                          │  Crée la salle vidéo     │
   │                          │  Notifie le patient      │
   │  🔔 "Votre médecin       │                          │
   │      est prêt"           │                          │
   │◄─────────────────────────│                          │
   │                          │                          │
   │   [SESSION VIDÉO]        │              [SESSION VIDÉO]
   │◄────────────────────────────────────────────────────│
```

La vidéo (Daily.co) est directe entre les deux téléphones — le serveur MBOLO donne juste les clés d'accès à la salle, il ne transporte pas la vidéo lui-même.

---

## La base de données — c'est quoi ?

La **base de données** est l'endroit où toutes les informations sont stockées de façon permanente. Si on éteint et rallume le serveur, les données sont toujours là.

Elle contient :
- Tous les comptes utilisateurs (patients, médecins, pharmaciens, livreurs)
- Les ordonnances et leur historique de statut
- Les rendez-vous et consultations
- Toutes les transactions financières
- Les livraisons et positions GPS

Elle est distincte du serveur : c'est un programme séparé (PostgreSQL) qui tourne en parallèle. En développement local, il tourne dans un conteneur Docker.

---

## Le cache — c'est quoi ?

Le **cache** (Redis) est une mémoire ultra-rapide mais temporaire. On y stocke des données qui ont une durée de vie courte :

- **Codes OTP** : le code SMS envoyé au téléphone expire après 5 minutes — il est stocké dans Redis, pas en base
- **Sessions** : informations temporaires pour éviter de reconsulter la base à chaque clic

Si le cache est vidé, rien de grave — les codes OTP en cours deviennent invalides (les utilisateurs reçoivent un nouveau SMS), mais les données permanentes restent intactes en base.

---

## Les services externes

Le serveur MBOLO ne fait pas tout seul — il délègue certaines tâches à des services spécialisés :

| Ce dont on a besoin | Service utilisé | Rôle |
|---------------------|-----------------|------|
| Envoyer un SMS (OTP) | Africa's Talking | Passerelle SMS |
| Encaisser un paiement | MyPVIT | Airtel Money / Moov Money |
| Faire une vidéo | Daily.co | Salles vidéo sécurisées |
| Notifier le téléphone | Expo + Firebase | Notifications push Android |

Ces services sont comme des sous-traitants. MBOLO les appelle via Internet, ils exécutent la tâche et renvoient le résultat.

En développement (sur l'ordinateur du développeur), tous ces services sont **simulés** — les SMS apparaissent dans les logs, les paiements passent automatiquement en "succès", la vidéo utilise des URLs fictives. Aucun compte payant n'est nécessaire pour développer.

---

## Résumé visuel complet

```
                        ┌─────────────────────┐
                        │   SERVEUR MBOLO      │
                        │   (backend + BDD)    │
                        └──────────┬──────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
    ┌──────────────┐    ┌──────────────────┐   ┌──────────────┐
    │  APPLICATION │    │  SERVICES EXT.   │   │  APPLICATION │
    │    MOBILE    │    │                  │   │    MOBILE    │
    │   (patient)  │    │  • MyPVIT        │   │  (médecin /  │
    │              │    │  • Africa's Talk │   │   pharmacie /│
    │  même APK    │    │  • Daily.co      │   │   livreur)   │
    │  rôle adapt. │    │  • Expo + FCM    │   │  même APK    │
    └──────────────┘    └──────────────────┘   └──────────────┘
```

**Une seule APK** → installée sur tous les téléphones → **l'interface s'adapte au rôle**.

**Un serveur central** → reçoit toutes les actions → applique les règles → coordonne.

**Des services externes** → SMS, paiement, vidéo, notifications → chacun spécialisé dans son domaine.

---

## Pour aller plus loin

- **Configurer les services externes** → [`docs/PROVIDERS.md`](./PROVIDERS.md)
- **Liste de tous les endpoints API** → [`docs/API.md`](./API.md)
- **Guide d'utilisation par rôle** → [`docs/GUIDE_UTILISATEUR.md`](./GUIDE_UTILISATEUR.md)
- **Installation et démarrage** → [`README.md`](../README.md)
