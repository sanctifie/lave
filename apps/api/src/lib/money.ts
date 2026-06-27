/**
 * Montant reversé au bénéficiaire après déduction de la commission plateforme.
 * @param totalFcfa     montant total encaissé (FCFA)
 * @param commissionPct pourcentage retenu par la plateforme (0–100)
 * @returns part du bénéficiaire, arrondie à l'entier inférieur, jamais négative
 */
export function payoutAfterCommission(totalFcfa: number, commissionPct: number): number {
  if (totalFcfa <= 0) return 0;
  const pct = Math.min(Math.max(commissionPct, 0), 100);
  return Math.max(0, Math.floor(totalFcfa * (1 - pct / 100)));
}
