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

  /**
   * Résout la liste des userId autorisés à accéder à une conversation,
   * selon l'entité référencée (refTable/refId). Retourne null si l'entité
   * est introuvable.
   */
  async resolveParticipants(refTable: string, refId: string): Promise<string[] | null> {
    switch (refTable) {
      case 'appointment': {
        const appt = await prisma.appointment.findUnique({
          where:  { id: refId },
          select: { patientId: true, doctor: { select: { userId: true } } },
        });
        if (!appt) return null;
        return [appt.patientId, appt.doctor.userId];
      }
      case 'order': {
        const order = await prisma.order.findUnique({
          where:  { id: refId },
          select: { patientId: true, partner: { select: { staff: { select: { id: true } } } } },
        });
        if (!order) return null;
        return [order.patientId, ...order.partner.staff.map((s: { id: string }) => s.id)];
      }
      case 'delivery': {
        const delivery = await prisma.delivery.findUnique({
          where:  { id: refId },
          select: {
            courier: { select: { userId: true } },
            order:   { select: { patientId: true } },
          },
        });
        if (!delivery) return null;
        return [
          ...(delivery.order?.patientId ? [delivery.order.patientId] : []),
          ...(delivery.courier?.userId ? [delivery.courier.userId] : []),
        ];
      }
      default:
        return null;
    }
  }
}
