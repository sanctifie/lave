import { AiProvider, ReviewModeration, Posology, DocumentScreening } from './index';

/**
 * Stub IA (dev / CI / aucune clé configurée). Comportement volontairement
 * conservateur : on ne bloque jamais un utilisateur sur une absence d'IA, et le
 * contrôle humain reste requis là où l'IA aurait aidé.
 */
export class StubAiProvider implements AiProvider {
  readonly enabled = false;

  async moderateReview(_comment: string): Promise<ReviewModeration> {
    // Sans IA : on laisse passer, non signalé (le contrôle humain admin reste possible).
    return { flagged: false, reason: null };
  }

  async parsePosology(_instructions: string): Promise<Posology | null> {
    // Sans IA : pas d'extraction → l'app retombe sur la saisie manuelle des horaires.
    return null;
  }

  async screenDocument(_input: { imageBase64: string; mediaType: string; docType: string }): Promise<DocumentScreening> {
    // Sans IA : rien n'est pré-jugé, la vérification humaine est explicitement requise.
    return { legible: true, concerns: ['Pré-contrôle IA indisponible — vérification manuelle requise'] };
  }
}
