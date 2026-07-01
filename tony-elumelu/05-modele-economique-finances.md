# 05 · Modèle économique & finances

> Hypothèses à ajuster avec tes vrais chiffres. Taux de référence : 1 USD ≈ 600 FCFA
> (paramètre utilisé dans l'app). Les 5 000 USD ≈ **3 000 000 FCFA**.

## 1. Sources de revenus (sans aucune marge sur les médicaments)

| Source | Base (paramétrable dans l'app) | Qui paie |
|--------|--------------------------------|----------|
| **Commission plateforme** | ≈ **15 %** sur les paiements | prélevée sur le reversement médecin / coursier / cuisine |
| **Frais de service** (commande pharmacie) | **500 FCFA** / commande | patient |
| **Frais de livraison** | **1 000 FCFA** + **200 FCFA/km** | patient |
| **Transport médical (course)** | **1 500 FCFA** + **200 FCFA/km** | patient |
| **Livraison repas** | **500 FCFA** + commission cuisine | patient |
| **Téléconsultation** | frais de base + frais vidéo, commission 15 % | patient → médecin |

> ⚖️ **Le médicament lui-même n'est jamais une source de marge** : le prix des
> médicaments revient intégralement à la pharmacie. MBOLO se rémunère sur le
> **service** (mise en relation, logistique, paiement). C'est légal **et** scalable.

## 2. Unit economics — exemple d'une commande pharmacie

Hypothèse : panier médicaments 10 000 FCFA, livraison 2 km.

| Ligne | Montant |
|-------|---------|
| Médicaments (revient à la pharmacie) | 10 000 FCFA |
| Frais de service MBOLO | +500 FCFA |
| Frais de livraison (1 000 + 2×200) | +1 400 FCFA |
| **Payé par le patient** | **11 900 FCFA** |
| **Revenu brut MBOLO** (service + livraison) | **1 900 FCFA** |
| – Rémunération coursier (≈ 60 % de la livraison) | −840 FCFA |
| – Frais paiement mobile money (≈ 2 %) | −238 FCFA |
| **Marge brute MBOLO / commande** | **≈ 820 FCFA** |

> Exemple consultation : sur une téléconsultation à 10 000 FCFA, commission 15 %
> ≈ **1 500 FCFA** de revenu plateforme (le reste au médecin).

## 3. Projection illustrative — An 1 (Libreville)

Hypothèses prudentes (à remplacer par tes cibles) :

| Mois | Commandes/mois | Courses/mois | Consult./mois | Revenu MBOLO (FCFA) |
|------|----------------|--------------|---------------|---------------------|
| M1–M3 (pilote) | 150 | 40 | 30 | ~[300 000] |
| M4–M6 | 500 | 120 | 90 | ~[1 000 000] |
| M7–M12 | 1 200 | 300 | 200 | ~[2 500 000] |

*(Revenu = marge brute moyenne par transaction × volume ; ordre de grandeur à affiner.)*

## 4. Emploi des 5 000 USD (≈ 3 M FCFA)

| Poste | % | Montant (FCFA) |
|-------|---|----------------|
| Acquisition partenaires + utilisateurs (terrain, marketing) | 40 % | 1 200 000 |
| Exploitation (serveurs, SMS/WhatsApp, vidéo, mobile money) | 20 % | 600 000 |
| Flotte coursiers + incitations de lancement | 20 % | 600 000 |
| Conformité & juridique (RCCM, conventions pharmacies) | 10 % | 300 000 |
| Améliorations produit prioritaires | 10 % | 300 000 |

## 5. Chemin vers la rentabilité

- **Coût marginal logiciel quasi nul** : chaque nouvelle ville réutilise la même app
  et la même API → l'essentiel du coût est l'**acquisition** (partenaires + patients).
- **Seuil de rentabilité** atteint quand le volume mensuel × marge brute moyenne
  couvre les coûts fixes (serveurs, support, salaires). À modéliser avec tes coûts réels.
- **Leviers de marge** : densité des livraisons (plus de commandes par tournée),
  montée de la téléconsultation (forte marge), abonnements pharmacies (optionnel).

## 6. Ce que le jury veut voir ici

1. Tu **comprends tes chiffres** (d'où vient chaque franc).
2. Le modèle est **défendable légalement** (zéro marge médicament).
3. Il est **scalable** (réplication ville par ville).
4. Les 5 000 USD ont un **emploi précis et mesurable**.
