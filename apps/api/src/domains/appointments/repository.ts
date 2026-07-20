import { prisma } from '../../infrastructure/prisma/client';
import { AppointmentStatus, ConsultationStatus, PrescriptionSource, PrescriptionType, PrescriptionStatus } from '@mbolo/shared';

const DOCTOR_INCLUDE = {
  doctor: {
    include: {
      user:     { select: { name: true } },
      specialty: { select: { name: true } },
    },
  },
} as const;

const PATIENT_INCLUDE = {
  patient: { select: { name: true, phone: true } },
} as const;

const FULL_INCLUDE = {
  ...DOCTOR_INCLUDE,
  ...PATIENT_INCLUDE,
  consultation: {
    include: {
      videoSession: true,
    },
  },
} as const;

export class AppointmentRepository {
  /** Patient : ses propres RDV */
  async listForPatient(patientId: string) {
    return prisma.appointment.findMany({
      where:   { patientId },
      include: DOCTOR_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Médecin : la file de son profil */
  async listForDoctor(doctorProfileId: string) {
    return prisma.appointment.findMany({
      where:   { doctorId: doctorProfileId },
      include: { ...DOCTOR_INCLUDE, ...PATIENT_INCLUDE },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.appointment.findUnique({
      where:   { id },
      include: FULL_INCLUDE,
    });
  }

  async create(data: {
    patientId:      string;
    doctorId:       string;
    type:           string;
    scheduledAt?:   Date;
    chiefComplaint?: string;
  }) {
    return prisma.appointment.create({
      data: {
        patientId:   data.patientId,
        doctorId:    data.doctorId,
        type:        data.type as Parameters<typeof prisma.appointment.create>[0]['data']['type'],
        scheduledAt: data.scheduledAt,
        notes:       data.chiefComplaint,
      },
      include: DOCTOR_INCLUDE,
    });
  }

  async cancel(id: string) {
    return prisma.appointment.update({
      where:  { id },
      data:   { status: AppointmentStatus.CANCELLED },
      include: DOCTOR_INCLUDE,
    });
  }

  async setWaitingRoom(id: string) {
    return prisma.appointment.update({
      where:  { id },
      data:   { status: AppointmentStatus.WAITING_ROOM },
      include: FULL_INCLUDE,
    });
  }

  /** Renvoie les RDV programmés dont l'heure est dans [nowPlus4, nowPlus6[ et non encore en salle d'attente */
  async findUpcomingInWindow(windowStart: Date, windowEnd: Date) {
    return prisma.appointment.findMany({
      where: {
        type:       'scheduled',
        status:     { in: ['pending', 'confirmed'] as any },
        scheduledAt: { gte: windowStart, lt: windowEnd },
      },
      include: { patient: { select: { id: true } } },
    });
  }

  /** Démarre la consultation : crée Consultation + VideoSession, passe appointment → in_progress */
  async startConsultation(data: {
    appointmentId:   string;
    doctorProfileId: string;
    roomName:        string;
    roomUrl:         string;
    hostToken:       string;
    guestToken:      string;
    expiresAt:       Date;
  }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return prisma.$transaction(async (tx: any) => {
      const consultation = await tx.consultation.create({
        data: {
          appointmentId: data.appointmentId,
          doctorId:      data.doctorProfileId,
          status:        ConsultationStatus.IN_PROGRESS,
          startedAt:     new Date(),
          videoSession: {
            create: {
              providerRoomName: data.roomName,
              providerRoomUrl:  data.roomUrl,
              hostToken:        data.hostToken,
              guestToken:       data.guestToken,
              startedAt:        new Date(),
            },
          },
        },
        include: { videoSession: true },
      });

      await tx.appointment.update({
        where: { id: data.appointmentId },
        data:  { status: AppointmentStatus.IN_PROGRESS },
      });

      return consultation;
    });
  }

  /** Clôture : calcule durée, persiste notes, fees, prescription optionnelle */
  async completeConsultation(data: {
    appointmentId:   string;
    consultationId:  string;
    doctorProfileId: string;
    patientId:       string;
    notes:           string;
    durationSeconds: number;
    serviceFeeFcfa:  number;
    videoFeeFcfa:    number;
    prescriptionText?: string;
  }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return prisma.$transaction(async (tx: any) => {
      await tx.videoSession.updateMany({
        where: { consultationId: data.consultationId },
        data:  { endedAt: new Date() },
      });

      const consultation = await tx.consultation.update({
        where: { id: data.consultationId },
        data: {
          status:          ConsultationStatus.COMPLETED,
          notes:           data.notes,
          durationSeconds: data.durationSeconds,
          serviceFeeFcfa:  data.serviceFeeFcfa,
          videoFeeFcfa:    data.videoFeeFcfa,
          endedAt:         new Date(),
        },
      });

      await tx.appointment.update({
        where: { id: data.appointmentId },
        data:  { status: AppointmentStatus.COMPLETED },
      });

      let prescription = null;
      if (data.prescriptionText) {
        prescription = await tx.prescription.create({
          data: {
            patientId:      data.patientId,
            source:         PrescriptionSource.TELECONSULTATION,
            type:           PrescriptionType.DRUG,
            status:         PrescriptionStatus.PENDING_VALIDATION,
            consultationId: data.consultationId,
            issuedById:     data.doctorProfileId,
            issuedAt:       new Date(),
            notes:          data.prescriptionText,
          },
        });
      }

      return { consultation, prescription };
    });
  }

  async patientRecordForAppointment(appointmentId: string) {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        patientId: true,
        patient: {
          select: {
            name: true, phone: true,
            patientProfile: {
              select: { dateOfBirth: true, bloodType: true, allergies: true, insuranceProvider: true },
            },
            prescriptionsOwned: {
              orderBy: { createdAt: 'desc' },
              take: 5,
              select: { id: true, type: true, status: true, createdAt: true, notes: true },
            },
          },
        },
      },
    });
    return appt;
  }

}
