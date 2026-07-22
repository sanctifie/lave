import { describe, it, expect } from 'vitest';
import { caisseShareOf, reimbursableBaseOf } from './repository';
import { SubstitutionStatus, RecommendationStatus } from '@mbolo/shared';

// Tiers-payant CNAMGS : la part caisse se calcule sur la BASE REMBOURSABLE
// (articles inscrits sur la liste), jamais sur tout le panier. Les articles hors
// liste (parapharmacie, conseil officinal) restent à 100 % à la charge de l'assuré.

const prescribed = (over: Partial<Parameters<typeof reimbursableBaseOf>[0][number]> = {}) => ({
  substitutionStatus: SubstitutionStatus.NONE,
  recommendationStatus: RecommendationStatus.NONE,
  reimbursable: true,
  totalFcfa: 0,
  ...over,
});

describe('caisseShareOf', () => {
  it('applique le taux à la base remboursable, arrondi à l\'entier FCFA', () => {
    expect(caisseShareOf(7000, 80)).toBe(5600); // maladie ordinaire
    expect(caisseShareOf(7000, 90)).toBe(6300); // longue durée
    expect(caisseShareOf(7000, 100)).toBe(7000); // 100 %
    expect(caisseShareOf(3333, 80)).toBe(2666); // arrondi
  });

  it('borne le taux entre 0 et 100', () => {
    expect(caisseShareOf(1000, 150)).toBe(1000);
    expect(caisseShareOf(1000, -10)).toBe(0);
  });
});

describe('reimbursableBaseOf', () => {
  it('ne compte que les articles remboursables', () => {
    const items = [
      prescribed({ totalFcfa: 5000, reimbursable: true }),
      prescribed({ totalFcfa: 3000, reimbursable: false }), // hors liste
    ];
    expect(reimbursableBaseOf(items)).toBe(5000);
  });

  it('exclut un équivalent refusé même s\'il est remboursable', () => {
    const items = [
      prescribed({ totalFcfa: 5000, reimbursable: true }),
      prescribed({ totalFcfa: 2000, reimbursable: true, substitutionStatus: SubstitutionStatus.REJECTED }),
    ];
    expect(reimbursableBaseOf(items)).toBe(5000);
  });

  it('exclut un conseil officinal tant qu\'il n\'est pas accepté', () => {
    const items = [
      prescribed({ totalFcfa: 5000, reimbursable: true }),
      prescribed({ totalFcfa: 1500, reimbursable: true, recommendationStatus: RecommendationStatus.SUGGESTED }),
    ];
    expect(reimbursableBaseOf(items)).toBe(5000);
  });

  it('cas complet : panier mixte → part caisse sur la seule base remboursable', () => {
    const items = [
      prescribed({ totalFcfa: 6000, reimbursable: true }),  // sur la liste
      prescribed({ totalFcfa: 4000, reimbursable: false }), // hors liste (parapharmacie)
    ];
    const base = reimbursableBaseOf(items); // 6000, pas 10000
    expect(base).toBe(6000);
    // À 80 % : la caisse prend 4800, l'assuré paie 10000 - 4800 = 5200 (et non 2000).
    expect(caisseShareOf(base, 80)).toBe(4800);
  });
});
