# Captures d'écran — MBOLO Santé

> Charte unifiée **teal `#006D77`** sur les deux plateformes. Les captures du
> dashboard sont des rendus réels (Vite build + Chromium, données de démo) ; les
> écrans mobiles sont des maquettes fidèles à la charte (l'app réelle est
> React Native / Expo).

## 📱 Application mobile

Vue d'ensemble patient + pro :

![Accueil patient, transport, pharmacie](mobile/overview.png)
![Consultation médecin, coursier, messagerie](mobile/overview-2.png)
![Ordonnance, salle d'attente, paiement, médecins](mobile/overview-3.png)

| Écran | Aperçu |
|-------|--------|
| Accueil patient | [`mobile/patient-accueil.png`](mobile/patient-accueil.png) |
| Demande de transport (estimation live) | [`mobile/patient-transport.png`](mobile/patient-transport.png) |
| Envoyer une ordonnance | [`mobile/patient-ordonnance.png`](mobile/patient-ordonnance.png) |
| Validation d'ordonnance (pharmacien) | [`mobile/pharmacie-validation.png`](mobile/pharmacie-validation.png) |
| Suivi de livraison (temps réel) | [`mobile/patient-suivi-livraison.png`](mobile/patient-suivi-livraison.png) |
| Choisir un médecin | [`mobile/patient-medecins.png`](mobile/patient-medecins.png) |
| Salle d'attente vidéo | [`mobile/patient-salle-attente.png`](mobile/patient-salle-attente.png) |
| Paiement Mobile Money | [`mobile/patient-paiement.png`](mobile/patient-paiement.png) |
| Espace pharmacie / cuisine | [`mobile/pharmacie-cuisine.png`](mobile/pharmacie-cuisine.png) |
| Consultation médecin (vidéo) | [`mobile/medecin-consultation.png`](mobile/medecin-consultation.png) |
| Espace coursier (suivi de course) | [`mobile/coursier-course.png`](mobile/coursier-course.png) |
| Messagerie patient ↔ médecin | [`mobile/chat.png`](mobile/chat.png) |

### Galerie complète — toutes les options (`mobile/app/`)

Rendus device (iPhone) de **toutes les options** de l'app, régénérables via
`node docs/screenshots/mobile/app/_allshots.mjs`, `_newshots.mjs` et
`_extrashots.mjs` (source : `mobile/app/_prototype.html`).

| # | Option | Fichier |
|---|--------|---------|
| 00 | Connexion | [`app/00-auth-login.png`](mobile/app/00-auth-login.png) |
| 01 | Vérification OTP | [`app/01-auth-otp.png`](mobile/app/01-auth-otp.png) |
| 02 | Accueil patient | [`app/02-patient-accueil.png`](mobile/app/02-patient-accueil.png) |
| 03 | Choisir un médecin | [`app/03-patient-medecins.png`](mobile/app/03-patient-medecins.png) |
| 04 | Consultation vidéo | [`app/04-consultation-video.png`](mobile/app/04-consultation-video.png) |
| 05 | Messagerie | [`app/05-messagerie.png`](mobile/app/05-messagerie.png) |
| 06 | Ordonnance | [`app/06-ordonnance.png`](mobile/app/06-ordonnance.png) |
| 07 | Paiement séquestre | [`app/07-paiement-sequestre.png`](mobile/app/07-paiement-sequestre.png) |
| 08 | Suivi de livraison | [`app/08-suivi-livraison.png`](mobile/app/08-suivi-livraison.png) |
| 09 | Livré · succès | [`app/09-livre-succes.png`](mobile/app/09-livre-succes.png) |
| 10 | Transport médical | [`app/10-transport-course.png`](mobile/app/10-transport-course.png) |
| 11 | Repas thérapeutiques | [`app/11-repas-therapeutiques.png`](mobile/app/11-repas-therapeutiques.png) |
| 12 | Profil patient | [`app/12-profil-patient.png`](mobile/app/12-profil-patient.png) |
| 13 | Espace médecin | [`app/13-espace-medecin.png`](mobile/app/13-espace-medecin.png) |
| 14 | Espace pharmacie | [`app/14-espace-pharmacie.png`](mobile/app/14-espace-pharmacie.png) |
| 15 | Validation d'ordonnance | [`app/15-validation-ordonnance.png`](mobile/app/15-validation-ordonnance.png) |
| 16 | Espace coursier | [`app/16-espace-coursier.png`](mobile/app/16-espace-coursier.png) |
| 17 | Alerte allergies | [`app/17-allergies-validation.png`](mobile/app/17-allergies-validation.png) |
| 18 | Conseil pharmacien | [`app/18-conseil-pharmacien.png`](mobile/app/18-conseil-pharmacien.png) |
| 19 | Conseil · choix patient | [`app/19-conseil-patient.png`](mobile/app/19-conseil-patient.png) |
| 20 | Rappels de prise (locaux) | [`app/20-rappels-prise.png`](mobile/app/20-rappels-prise.png) |
| 21 | Renouvellement | [`app/21-renouvellement.png`](mobile/app/21-renouvellement.png) |
| 22 | Tiers-payant CNAMGS | [`app/22-tiers-payant-cnamgs.png`](mobile/app/22-tiers-payant-cnamgs.png) |
| 23 | Profil · assurance | [`app/23-profil-assurance.png`](mobile/app/23-profil-assurance.png) |
| 24 | Pharmacies de garde | [`app/24-pharmacies-de-garde.png`](mobile/app/24-pharmacies-de-garde.png) |
| 25 | Centre de notifications | [`app/25-centre-notifications.png`](mobile/app/25-centre-notifications.png) |
| 26 | Remboursement séquestre | [`app/26-remboursement-sequestre.png`](mobile/app/26-remboursement-sequestre.png) |
| 27 | Espace aidant | [`app/27-espace-aidant.png`](mobile/app/27-espace-aidant.png) |

## 🖥️ Dashboard web (administration)

| Page | Aperçu |
|------|--------|
| Connexion (OTP) | [`web/01-login.png`](web/01-login.png) |
| Tableau de bord | [`web/02-dashboard.png`](web/02-dashboard.png) |
| Commandes | [`web/03-orders.png`](web/03-orders.png) |
| Tarification | [`web/04-pricing.png`](web/04-pricing.png) |
| Livraisons | [`web/05-deliveries.png`](web/05-deliveries.png) |
| Transport | [`web/06-rides.png`](web/06-rides.png) |
| Repas | [`web/07-meals.png`](web/07-meals.png) |
| Médecins | [`web/08-doctors.png`](web/08-doctors.png) |
| Utilisateurs | [`web/09-users.png`](web/09-users.png) |

![Tableau de bord](web/02-dashboard.png)
