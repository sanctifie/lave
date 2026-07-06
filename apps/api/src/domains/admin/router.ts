import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../lib/asyncHandler';
import { prisma } from '../../infrastructure/prisma/client';
import { UserRole } from '@mbolo/shared';

const router: Router = Router();

router.use(requireAuth, requireRole(UserRole.ADMIN));

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [orders, deliveries, rides, mealOrders, appointments, users, doctors] =
      await Promise.all([
        prisma.order.count(),
        prisma.delivery.count(),
        prisma.ride.count(),
        prisma.mealOrder.count(),
        prisma.appointment.count(),
        prisma.user.count(),
        prisma.doctorProfile.count(),
      ]);
    res.json({ data: { orders, deliveries, rides, mealOrders, appointments, users, doctors } });
  }),
);

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const orders = await prisma.order.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        patient: { select: { name: true, phone: true } },
        partner: { select: { legalName: true } },
        items: true,
        delivery: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ data: orders });
  }),
);

router.get(
  '/deliveries',
  asyncHandler(async (_req, res) => {
    const deliveries = await prisma.delivery.findMany({
      include: {
        courier: { include: { user: { select: { name: true, phone: true } } } },
        order: { select: { partner: { select: { legalName: true } }, patient: { select: { name: true } } } },
        ride:  { select: { request: true } },
        mealOrder: { select: { mealPlan: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ data: deliveries });
  }),
);

router.get(
  '/rides',
  asyncHandler(async (_req, res) => {
    const rides = await prisma.ride.findMany({
      include: {
        request: true,
        delivery: { select: { status: true, courier: { include: { user: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ data: rides });
  }),
);

router.get(
  '/meals',
  asyncHandler(async (_req, res) => {
    const orders = await prisma.mealOrder.findMany({
      include: {
        mealPlan: { select: { name: true, partnerId: true } },
        delivery: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ data: orders });
  }),
);

router.get(
  '/doctors',
  asyncHandler(async (_req, res) => {
    const doctors = await prisma.doctorProfile.findMany({
      include: {
        user: { select: { name: true, phone: true, isActive: true } },
        specialty: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: doctors });
  }),
);

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const role = req.query.role as string | undefined;
    const users = await prisma.user.findMany({
      where: role ? { role: role as any } : undefined,
      select: { id: true, name: true, phone: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    res.json({ data: users });
  }),
);

router.get(
  '/partners',
  asyncHandler(async (_req, res) => {
    const partners = await prisma.partnerProfile.findMany({
      include: { staff: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: partners });
  }),
);

router.patch(
  '/users/:id/toggle',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) { res.status(404).json({ error: 'Utilisateur introuvable' }); return; }
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });
    res.json({ data: updated });
  }),
);

export { router as adminRouter };
