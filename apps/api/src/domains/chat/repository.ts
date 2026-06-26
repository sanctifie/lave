import { prisma } from '../../infrastructure/prisma/client';

export class ChatRepository {
  async getOrCreate(refTable: string, refId: string) {
    const existing = await prisma.conversation.findFirst({ where: { refTable, refId } });
    if (existing) return existing;
    return prisma.conversation.create({ data: { refTable, refId } });
  }

  async findById(id: string) {
    return prisma.conversation.findUnique({ where: { id } });
  }

  async listMessages(conversationId: string, after?: string) {
    return prisma.message.findMany({
      where: {
        conversationId,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  async send(conversationId: string, senderId: string, body: string) {
    return prisma.message.create({
      data: { conversationId, senderId, body },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });
  }
}
