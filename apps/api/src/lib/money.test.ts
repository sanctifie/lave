import { describe, it, expect } from 'vitest';
import { payoutAfterCommission } from './money';

describe('payoutAfterCommission', () => {
  it('retire la commission et arrondit à l\'entier inférieur', () => {
    // 10 000 - 15% = 8 500
    expect(payoutAfterCommission(10_000, 15)).toBe(8_500);
    // 1 333 - 15% = 1 133.05 → 1 133
    expect(payoutAfterCommission(1_333, 15)).toBe(1_133);
  });

  it('renvoie le total quand la commission est nulle', () => {
    expect(payoutAfterCommission(5_000, 0)).toBe(5_000);
  });

  it('renvoie 0 pour des montants nuls ou négatifs', () => {
    expect(payoutAfterCommission(0, 15)).toBe(0);
    expect(payoutAfterCommission(-100, 15)).toBe(0);
  });

  it('borne la commission entre 0 et 100', () => {
    expect(payoutAfterCommission(1_000, 150)).toBe(0);
    expect(payoutAfterCommission(1_000, -50)).toBe(1_000);
  });
});
