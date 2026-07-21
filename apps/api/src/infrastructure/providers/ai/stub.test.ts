import { describe, it, expect } from 'vitest';
import { StubAiProvider } from './stub';

describe('StubAiProvider — comportement conservateur sans clé', () => {
  const ai = new StubAiProvider();

  it('n\'est pas activé', () => {
    expect(ai.enabled).toBe(false);
  });

  it('ne signale jamais un avis (pas de blocage sur absence d\'IA)', async () => {
    expect(await ai.moderateReview('peu importe')).toEqual({ flagged: false, reason: null });
  });

  it('ne devine pas de posologie (retombe sur la saisie manuelle)', async () => {
    expect(await ai.parsePosology('1 comprimé matin et soir')).toBeNull();
  });

  it('exige une vérification manuelle du document KYC', async () => {
    const r = await ai.screenDocument({ imageBase64: 'x', mediaType: 'image/png', docType: 'cni' });
    expect(r.concerns.length).toBeGreaterThan(0);
  });
});
