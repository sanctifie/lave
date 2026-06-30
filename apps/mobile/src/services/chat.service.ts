import { apiClient } from './client';

export interface Conversation {
  id: string;
  refTable: string;
  refId: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
}

export const chatService = {
  async getOrCreate(refTable: string, refId: string): Promise<Conversation> {
    const { data } = await apiClient.post('/chat/conversations', { refTable, refId });
    return data.data;
  },

  async listMessages(conversationId: string, after?: string): Promise<ChatMessage[]> {
    const { data } = await apiClient.get(`/chat/conversations/${conversationId}/messages`, {
      params: after ? { after } : {},
    });
    return data.data;
  },

  async sendMessage(conversationId: string, body: string): Promise<ChatMessage> {
    const { data } = await apiClient.post(`/chat/conversations/${conversationId}/messages`, { body });
    return data.data;
  },
};
