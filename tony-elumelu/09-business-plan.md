# 09 · Business Plan — MBOLO Santé

*Format adapté au Tony Elumelu Foundation Entrepreneurship Programme. Les valeurs
[entre crochets] sont à compléter avec tes données réelles.*

---

## 1. Résumé exécutif

**MBOLO Santé** est une plateforme mobile gabonaise qui intègre, en un seul service :
téléconsultation médicale, ordonnance numérique validée par le pharmacien, livraison
de médicaments à domicile, transport médical et repas diététiques — le tout payé en
Mobile Money (Airtel/Moov).

La plateforme **n'est jamais le vendeur du médicament** : le pharmacien reste le
dispensateur légal et valide toute ordonnance avant préparation. MBOLO se rémunère
sur le **service** (commission, livraison, consultation, transport), **sans aucune
marge sur les médicaments** — un modèle **conforme et scalable**.

Le produit est **déjà développé** (application mobile multi-rôles, API, tableau de
bord d'administration). Avec le soutien du TEF (5 000 USD + formation + mentorat),
MBOLO lance son pilote à Libreville, crée des emplois de coursiers et se réplique
ensuite dans la zone CEMAC.

| | |
|---|---|
| **Siège** | Libreville, Gabon |
| **Secteur** | HealthTech / logistique de soins |
| **Stade** | Produit développé, lancement/pilote |
| **Demande TEF** | 5 000 USD (capital d'amorçage) |

## 2. Problème

Voir [`08-etude-marche-gabon.md`](08-etude-marche-gabon.md). En bref : accès aux soins
et médicaments lent et incertain (files, ruptures, déplacements), médecins difficiles
à joindre vite, populations isolées/âgées mal desservies, aucun service intégré avec
paiement local.

## 3. Solution & produit

Une application unique qui s'adapte au rôle de l'utilisateur :
- **Patient** : consulte un médecin vérifié en vidéo, envoie son ordonnance à la
  pharmacie de son choix, se fait livrer, commande un transport médical ou des repas,
  paie en Mobile Money, échange par messagerie.
- **Médecin** : gère sa file, fait la téléconsultation, émet l'ordonnance numérique.
- **Pharmacie** : valide/refuse l'ordonnance, prépare la commande.
- **Coursier** : accepte livraisons et courses, suivi GPS étape par étape.

*Preuve d'exécution : captures dans `docs/screenshots/` (9 écrans web + 11 écrans
mobiles).*

## 4. Marché

Voir l'étude détaillée [`08-etude-marche-gabon.md`](08-etude-marche-gabon.md).
Synthèse : Gabon **91 % urbain**, **1,84 M internautes**, **88 % haut débit**,
mobile money mûr. SAM ≈ 600–800 k adultes connectés (Libreville + Port-Gentil) ;
SOM An 3 ≈ 20–35 k utilisateurs actifs/mois [hyp.]. Expansion CEMAC (~60 M hab.).

## 5. Concurrence & avantage

Pas d'acteur **intégré** équivalent au Gabon [à vérifier]. Avantages défendables :
réseau de partenaires (effet de réseau), **conformité réglementaire intégrée**,
produit déjà construit, intégration mobile money, densité logistique.

## 6. Modèle économique

Voir [`05-modele-economique-finances.md`](05-modele-economique-finances.md).
Revenus : commission plateforme (~15 %) + frais de service + frais de livraison +
frais de transport. **Zéro marge sur les médicaments.** Coût marginal logiciel quasi
nul → forte scalabilité.

## 7. Go-to-market (acquisition)

1. **Côté offre d'abord** : signer 3–5 pharmacies + 2–3 médecins vérifiés à Libreville
   (un service n'a de valeur que s'il y a des partenaires).
2. **Lancement géographique ciblé** : 2–3 quartiers denses de Libreville.
3. **Acquisition patients** : réseaux sociaux (30 % de la population), bouche-à-oreille,
   partenariats pharmacies (affiches/QR), incitations de première commande.
4. **Diaspora** : campagne ciblée (payer les soins de proches au pays).
5. **Densification** puis Port-Gentil, puis autres villes.

## 8. Opérations

- **Technologie** : app mobile (Expo/React Native), API (Node/PostgreSQL), dashboard
  admin web ; providers paiement (MyPVIT), vidéo (Daily.co), notifications
  (WhatsApp/SMS) activables.
- **Logistique** : coursiers géolocalisés, code de remise, paiement en séquestre
  libéré à la livraison.
- **Qualité/conformité** : médecins vérifiés (CNOM), validation pharmacien obligatoire.

## 9. Équipe

[Fondateur : nom, parcours, compétences, rôle. Souligne la **preuve d'exécution** :
conception et réalisation d'un produit complet.]
[Membres clés / à recruter : opérations terrain, partenariats santé, support.]
[Conseillers : pharmacien, médecin, juriste santé — un atout fort.]

## 10. Finances (synthèse)

Voir [`05-modele-economique-finances.md`](05-modele-economique-finances.md) pour le
détail (unit economics, projections, emploi des fonds). Marge brute moyenne
≈ 1 000 FCFA/transaction [hyp.] ; chemin vers la rentabilité par densification du
volume sur des coûts fixes maîtrisés.

## 11. Demande de financement & emploi des fonds (5 000 USD ≈ 3 M FCFA)

| Poste | % | Montant (FCFA) |
|-------|---|----------------|
| Acquisition partenaires + utilisateurs | 40 % | 1 200 000 |
| Exploitation (serveurs, SMS/WhatsApp, vidéo, mobile money) | 20 % | 600 000 |
| Flotte coursiers + incitations de lancement | 20 % | 600 000 |
| Conformité & juridique (RCCM, conventions) | 10 % | 300 000 |
| Améliorations produit prioritaires | 10 % | 300 000 |

## 12. Impact (mission TEF : emplois + développement)

- **Emplois** : coursiers rémunérés [cible An 1 : X], revenus additionnels pour
  pharmacies, médecins et cuisines partenaires.
- **Accès aux soins** : réduction des déplacements, service aux personnes
  isolées/âgées, médicaments livrés rapidement et en sécurité.
- **Inclusion numérique & financière** : usage du mobile money pour la santé.
- **ODD** : Santé & bien-être (ODD 3), Travail décent (ODD 8), Industrie/innovation
  (ODD 9).

## 13. Jalons (12 mois)

| Trimestre | Objectif |
|-----------|----------|
| T1 | Enregistrement entreprise, 3 pharmacies + 2 médecins signés, pilote 2 quartiers |
| T2 | [K] commandes/mois, [P] coursiers, premiers retours utilisateurs |
| T3 | Extension Libreville, lancement transport + repas à l'échelle |
| T4 | Port-Gentil, atteinte du seuil de rentabilité par transaction |

## 14. Risques

Voir tableau dans [`08-etude-marche-gabon.md`](08-etude-marche-gabon.md) (réglementaire,
adoption, logistique, paiement, fournisseurs) avec mesures d'atténuation.

---

> **Phrase-clé à retenir pour le jury :** « MBOLO Santé est une plateforme de
> services et de logistique de soins — jamais un vendeur de médicaments — déjà
> construite, conforme, et conçue pour se répliquer dans toute la zone CEMAC. »
