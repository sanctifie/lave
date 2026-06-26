import { HTTP } from '../../lib/errors';
import { ChatRepository } from './repository';
import { GetOrCreateConversationInput, SendMessageInput } from './schema';

export class ChatService {
  constructor(private readonly repo: ChatRepository) {}

  async getOrCreate(input: GetOrCreateConversationInput) {
    return this.repo.getOrCreate(input.refTable, input.refId);
  }

  async listMessages(conversationId: string, after?: string) {
    const conv = await this.repo.findById(conversationId);
    if (!conv) throw HTTP.notFound('Conversation introuvable');
    return this.repo.listMessages(conversationId, after);
  }

  async send(conversationId: string, senderId: string, input: SendMessageInput) {
    const conv = await this.repo.findById(conversationId);
    if (!conv) throw HTTP.notFound('Conversation introuvable');
    return this.repo.send(conversationId, senderId, input.body);
  }
}
