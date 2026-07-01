# 08 · Étude de marché — Gabon (chiffrée)

> Données ancrées sur des sources publiques (début 2025). Les chiffres marqués
> [hyp.] sont des hypothèses de travail à affiner. Sources en bas de page.

## 1. Contexte pays (le marché est « digital-ready »)

| Indicateur | Valeur (déb. 2025) | Implication pour MBOLO |
|------------|--------------------|------------------------|
| Population | **2,57 M** | Petit pays, mais concentré |
| Population **urbaine** | **91,4 %** | Logistique de livraison concentrée = efficace |
| Internautes | **1,84 M (71,9 %)** | Large base adressable en ligne |
| Connexions mobiles | **3,19 M (124 %)** | Multi-SIM, mobile omniprésent |
| Connexions **haut débit** (3G/4G/5G) | **88 %** | App vidéo/temps réel viable |
| Utilisateurs réseaux sociaux | 782 k (30,5 %) | Canal d'acquisition marketing |
| Mobile money | Airtel Money + Moov Money très répandus | Paiement intégré déjà adopté [vérifier % BEAC/GSMA] |

**Lecture :** un pays **petit mais très urbanisé et connecté**, avec mobile money
mûr — conditions idéales pour une plateforme santé/logistique mobile.

## 2. Problème de marché (la demande)

- **Concentration de l'offre de soins** à Libreville/Port-Gentil ; densité médicale
  faible (peu de médecins pour 1 000 hab.) → attente, déplacements.
- **Ruptures et files** en pharmacie ; pas de visibilité sur la disponibilité.
- **Populations vulnérables** (personnes âgées, malades chroniques, mobilité réduite)
  mal desservies.
- **Diaspora** qui finance les soins de proches restés au pays → besoin d'un service
  fiable et traçable.
- **Aucun acteur intégré** (consultation + ordonnance + pharmacie + livraison) avec
  paiement local.

## 3. Dimensionnement TAM / SAM / SOM

> Approche bottom-up, prudente. À affiner avec des données terrain.

### TAM — Marché total adressable
Internautes urbains du Gabon ≈ **1,7 M** (1,84 M × 91 %). En tant qu'utilisateurs
potentiels de services de santé/logistique digitaux.

### SAM — Marché adressable desservi
Adultes connectés **avec smartphone + mobile money** à **Libreville + Port-Gentil**
≈ **600 000 – 800 000** personnes [hyp.] (les deux villes concentrent l'essentiel
de la population urbaine et du pouvoir d'achat).

### SOM — Marché atteignable (3 ans)
Capture réaliste de **1 % → 3 %** d'utilisateurs **transactant chaque mois** :

| Horizon | Utilisateurs actifs/mois [hyp.] | Transactions/mois [hyp.] |
|---------|-------------------------------|--------------------------|
| An 1 (pilote Libreville) | 3 000 – 6 000 | 1 500 – 3 000 |
| An 2 (Libreville + P.-Gentil) | 10 000 – 18 000 | 8 000 – 15 000 |
| An 3 (densification) | 20 000 – 35 000 | 20 000 – 35 000 |

À une **marge brute moyenne de ~1 000 FCFA/transaction** (cf.
[`05-modele-economique-finances.md`](05-modele-economique-finances.md)), l'An 3
représente un revenu plateforme de l'ordre de **20–35 M FCFA/mois** [hyp.] —
à valider.

## 4. Offre / écosystème partenaires (côté « supply »)

| Partenaire | Rôle | Intérêt à rejoindre |
|------------|------|---------------------|
| **Pharmacies** | Dispensent les médicaments (rôle légal) | Nouveau canal de ventes, sans changer leur métier |
| **Médecins** (vérifiés CNOM) | Téléconsultation | Revenus additionnels, patients en plus |
| **Coursiers** | Livraison + transport | Emplois / revenus |
| **Cuisines diététiques** | Repas santé | Nouveau débouché |

> Nombre de pharmacies/médecins à Libreville : [à chiffrer via Conseil de l'Ordre /
> Ministère de la Santé] — un nombre concret renforce le dossier.

## 5. Concurrence & barrières à l'entrée

- **Concurrence directe** : peu/pas d'acteur **intégré** au Gabon aujourd'hui [vérifier].
  Concurrents indirects : pharmacies physiques, appels téléphoniques informels,
  livraisons ad hoc.
- **Barrières à l'entrée que MBOLO construit :**
  1. **Réseau de partenaires** (pharmacies + médecins vérifiés) — effet de réseau.
  2. **Conformité réglementaire** (validation pharmacien, médecins CNOM) — difficile
     à copier vite et rassure le régulateur.
  3. **Produit déjà construit** + intégration mobile money.
  4. **Données & densité logistique** (plus de volume → livraisons moins chères).

## 6. Stratégie d'expansion régionale (CEMAC)

Après le Gabon, réplication dans la **zone CEMAC** (~60 M d'habitants : Cameroun,
Tchad, Congo, RCA, Guinée équatoriale) qui partage la **même monnaie (FCFA)** et des
**opérateurs mobile money communs** → coût d'adaptation réduit (même app, même API).

## 7. Risques & atténuation

| Risque | Atténuation |
|--------|-------------|
| Réglementation pharmaceutique | Plateforme **jamais vendeuse** ; pharmacien dispense/valide |
| Adoption lente | Pilote ciblé, incitations de lancement, bouche-à-oreille |
| Logistique « dernier km » | Densité urbaine élevée (91 %) ; coursiers géolocalisés |
| Fiabilité paiement | Mobile money établi (Airtel/Moov) + séquestre (escrow) |
| Dépendance fournisseurs (vidéo/SMS) | Providers interchangeables (architecture à interfaces) |

## Sources
- [DataReportal — Digital 2025: Gabon](https://datareportal.com/reports/digital-2025-gabon)
- [Banque mondiale — Mobile cellular subscriptions](https://data.worldbank.org/indicator/IT.CEL.SETS.P2)
- [GSMA — Mobile Money Industry Report 2025](https://www.gsma.com/sotir/)
- À compléter : ARCEP Gabon, Ministère de la Santé, Conseil National de l'Ordre des
  Médecins (CNOM), Ordre des Pharmaciens (nombre de pharmacies/médecins).
