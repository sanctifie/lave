import { HTTP } from '../../lib/errors';
import { ChatRepository } from './repository';
import { GetOrCreateConversationInput, SendMessageInput } from './schema';
import { UserRole } from '@mbolo/shared';

export class ChatService {
  constructor(private readonly repo: ChatRepository) {}

  /** Vérifie que l'utilisateur fait partie des participants de l'entité référencée. */
  private async assertParticipant(refTable: string, refId: string, userId: string, role: UserRole) {
    if (role === UserRole.ADMIN) return;
    const participants = await this.repo.resolveParticipants(refTable, refId);
    if (participants === null) throw HTTP.notFound('Conversation introuvable');
    if (!participants.includes(userId)) throw HTTP.forbidden('Accès à cette conversation non autorisé');
  }

  async getOrCreate(input: GetOrCreateConversationInput, userId: string, role: UserRole) {
    await this.assertParticipant(input.refTable, input.refId, userId, role);
    return this.repo.getOrCreate(input.refTable, input.refId);
  }

  async listMessages(conversationId: string, userId: string, role: UserRole, after?: string) {
    const conv = await this.repo.findById(conversationId);
    if (!conv) throw HTTP.notFound('Conversation introuvable');
    await this.assertParticipant(conv.refTable, conv.refId, userId, role);
    return this.repo.listMessages(conversationId, after);
  }

  async send(conversationId: string, senderId: string, role: UserRole, input: SendMessageInput) {
    const conv = await this.repo.findById(conversationId);
    if (!conv) throw HTTP.notFound('Conversation introuvable');
    await this.assertParticipant(conv.refTable, conv.refId, senderId, role);
    return this.repo.send(conversationId, senderId, input.body);
  }
}
