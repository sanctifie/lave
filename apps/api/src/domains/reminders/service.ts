import { HTTP } from '../../lib/errors';
import { ReminderRepository } from './repository';
import { CreateReminderInput } from './schema';
import type { AiProvider } from '../../infrastructure/providers/ai';

export class ReminderService {
  constructor(
    private readonly repo: ReminderRepository,
    private readonly ai?: AiProvider,
  ) {}

  listMine(patientId: string) {
    return this.repo.listForPatient(patientId);
  }

  create(patientId: string, input: CreateReminderInput) {
    return this.repo.create(patientId, input);
  }

  async remove(id: string, patientId: string) {
    const rem = await this.repo.findById(id);
    if (!rem) throw HTTP.notFound('Rappel introuvable');
    if (rem.patientId !== patientId) throw HTTP.forbidden();
    return this.repo.deactivate(id);
  }

  /**
   * Lecture d'une posologie en texte libre (« 1 comprimé matin et soir pendant
   * 7 jours ») → horaires + durée proposés (claude-haiku-4-5). Sans IA → null,
   * l'app retombe sur la saisie manuelle. Le patient valide toujours.
   */
  async parsePosology(instructions: string) {
    if (!this.ai) return null;
    return this.ai.parsePosology(instructions).catch(() => null);
  }
}
