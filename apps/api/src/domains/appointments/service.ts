import { HTTP } from '../../lib/errors';
import { AppointmentRepository } from './repository';
import { DoctorRepository } from '../doctors/repository';
import { PricingRepository } from '../pricing/repository';
import { VideoProvider } from '../../infrastructure/providers/video';
import { NotificationService } from '../../infrastructure/providers/notification';
import { PushService } from '../../infrastructure/push/service';
import { CreateAppointmentInput, CompleteConsultationInput } from './schema';
import { AppointmentType, AppointmentStatus, UserRole, PartnerType } from '@mbolo/shared';
import { prisma } from '../../infrastructure/prisma/client';
import { PricingKind } from '@mbolo/shared';

export class AppointmentService {
  constructor(
    private readonly repo:        AppointmentRepository,
    private readonly doctorRepo:  DoctorRepository,
    private readonly pricingRepo: PricingRepository,
    private readonly video:       VideoProvider,
    private readonly notif:       NotificationService,
    private readonly push:        PushService,
  ) {}

  /** Liste selon le rôle — patient voit ses RDV, médecin voit sa file */
  async list(userId: string, role: string) {
    if (role === UserRole.DOCTOR) {
      const profile = await this.doctorRepo.findByUserId(userId);
      if (!profile) return [];
      return this.repo.listForDoctor(profile.id);
    }
    return this.repo.listForPatient(userId);
  }

  async getById(id: string, userId: string) {
    const appt = await this.repo.findById(id);
    if (!appt) throw HTTP.notFound('RDV introuvable');

    const isPatient = appt.patientId === userId;
    const profile   = await this.doctorRepo.findByUserId(userId);
    const isDoctor  = profile?.id === appt.doctorId;

    if (!isPatient && !isDoctor) throw HTTP.forbidden();
    return appt;
  }

  async create(patientId: string, input: CreateAppointmentInput) {
    if (input.type === AppointmentType.IMMEDIATE) {
      const available = await this.doctorRepo.listAvailableNow((input as any).specialty) as any[];
      if (available.length === 0) throw HTTP.unprocessable('Aucun médecin disponible en ce moment');
      const doctor = available[0];
      const appt = await this.repo.create({
        patientId,
        doctorId:       doctor.id as string,
        type:           input.type as string,
        chiefComplaint: (input as any).chiefComplaint,
      });
      // SMS + push au médecin
      this.notif.send({ to: doctor.user.phone, message: `Nouvelle consultation immédiate — patient en attente.` });
      this.push.sendToUser(doctor.userId as string, {
        title: '🚨 Nouvelle consultation',
        body:  'Un patient attend votre prise en charge immédiate.',
        data:  { type: 'immediate_appointment', appointmentId: appt.id },
      });
      return appt;
    }

    const doctor = await this.doctorRepo.findById(input.doctorId);
    if (!doctor) throw HTTP.notFound('Médecin introuvable');

    const appt = await this.repo.create({
      patientId,
      doctorId:       (input as any).doctorId,
      type:           input.type as string,
      scheduledAt:    (input as any).scheduledAt,
      chiefComplaint: (input as any).chiefComplaint,
    });
    this.notif.send({ to: (doctor as any).user.phone, message: `Nouveau RDV le ${(input as any).scheduledAt?.toLocaleDateString('fr-FR')}.` });
    this.push.sendToUser((doctor as any).userId as string, {
      title: '📅 Nouveau rendez-vous',
      body:  `RDV programmé le ${(input as any).scheduledAt?.toLocaleDateString('fr-FR') ?? '–'}`,
      data:  { type: 'new_appointment', appointmentId: appt.id },
    });
    return appt;
  }

  /** Patient entre en salle d'attente — disponible 10 min avant le RDV */
  async enterWaitingRoom(appointmentId: string, patientId: string) {
    const appt = await this.repo.findById(appointmentId);
    if (!appt) throw HTTP.notFound('RDV introuvable');
    if (appt.patientId !== patientId) throw HTTP.forbidden();

    const allowed: string[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];
    if (!allowed.includes(appt.status)) {
      throw HTTP.unprocessable('Impossible d\'entrer en salle d\'attente pour ce rendez-vous');
    }

    // Pour un RDV programmé : salle d'attente ouvre 10 min avant
    if (appt.type === 'scheduled' && appt.scheduledAt) {
      const diffMs = (appt.scheduledAt as Date).getTime() - Date.now();
      if (diffMs > 10 * 60 * 1000) {
        throw HTTP.unprocessable('La salle d\'attente ouvre 10 minutes avant la consultation');
      }
    }

    const updated = await this.repo.setWaitingRoom(appointmentId);

    // Vérifier si le médecin est déjà en consultation (pour l'affichage côté patient)
    const doctorBusy = await this.doctorRepo.listAvailableNow() as any[];
    const isDoctorBusy = !doctorBusy.some((d: any) => d.id === appt.doctorId);

    // Notifier le médecin qu'un patient attend
    const profile = await this.doctorRepo.findById(appt.doctorId);
    if (profile) {
      this.push.sendToUser((profile as any).userId, {
        title: '⏳ Patient en salle d\'attente',
        body:  `${(appt as any).patient?.name ?? 'Un patient'} attend votre prise en charge.`,
        data:  { type: 'patient_waiting', appointmentId },
      });
    }

    return { appointment: updated, doctorBusy: isDoctorBusy };
  }

  /** Médecin démarre : crée la session vidéo, notifie le patient */
  async start(appointmentId: string, doctorUserId: string) {
    const appt = await this.repo.findById(appointmentId);
    if (!appt) throw HTTP.notFound('RDV introuvable');
    const startableStatuses: string[] = [
      AppointmentStatus.PENDING,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.WAITING_ROOM,
    ];
    if (!startableStatuses.includes(appt.status)) {
      throw HTTP.unprocessable(`Impossible de démarrer : statut ${appt.status}`);
    }
    if (appt.consultation) throw HTTP.conflict('Consultation déjà démarrée');

    const profile = await this.doctorRepo.findByUserId(doctorUserId);
    if (!profile || profile.id !== appt.doctorId) throw HTTP.forbidden();

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h
    const room = await this.video.createRoom({ consultationId: appt.id, expiresAt });

    const consultation = await this.repo.startConsultation({
      appointmentId:   appt.id,
      doctorProfileId: profile.id,
      roomName:        room.roomName,
      roomUrl:         room.roomUrl,
      hostToken:       room.hostToken,
      guestToken:      room.guestToken,
      expiresAt,
    });

    // SMS + push au patient
    this.notif.send({
      to:      appt.patient.phone,
      message: `Votre médecin est prêt. Rejoignez la consultation : ${room.roomUrl}`,
    });
    this.push.sendToUser(appt.patientId, {
      title: '🩺 Votre médecin est prêt',
      body:  'Rejoignez la consultation maintenant.',
      data:  { type: 'consultation_start', appointmentId: appt.id },
    });

    return {
      ...consultation,
      hostVideoUrl:  room.roomUrl,
      guestVideoUrl: room.roomUrl,
    };
  }

  /** Médecin clôture : calcule frais vidéo, enregistre notes, émet ordonnance si besoin */
  async complete(appointmentId: string, doctorUserId: string, input: CompleteConsultationInput) {
    const appt = await this.repo.findById(appointmentId);
    if (!appt) throw HTTP.notFound('RDV introuvable');
    if (appt.status !== AppointmentStatus.IN_PROGRESS) {
      throw HTTP.unprocessable('La consultation n\'est pas en cours');
    }
    if (!appt.consultation) throw HTTP.unprocessable('Aucune session active');

    const profile = await this.doctorRepo.findByUserId(doctorUserId);
    if (!profile || profile.id !== appt.doctorId) throw HTTP.forbidden();

    const startedAt = appt.consultation.startedAt ?? new Date();
    const durationSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);

    const [rateEntry, fxEntry, baseFeeEntry] = await Promise.all([
      this.pricingRepo.getByKind(PricingKind.VIDEO_USD_PER_PARTICIPANT_MIN),
      this.pricingRepo.getByKind(PricingKind.USD_TO_FCFA_RATE),
      this.pricingRepo.getByKind(PricingKind.CONSULTATION_BASE_FEE),
    ]);
    const rateUsd        = Number(rateEntry?.valueNum  ?? 0.00099);
    const fxRate         = Number(fxEntry?.valueNum    ?? 600);
    const baseFee        = Number(baseFeeEntry?.valueFcfa ?? profile.consultationFeeFcfa);
    const minutes        = Math.ceil(durationSeconds / 60);
    const videoFeeFcfa   = Math.ceil(minutes * 2 * rateUsd * fxRate);
    const serviceFeeFcfa = baseFee + videoFeeFcfa;

    const result = await this.repo.completeConsultation({
      appointmentId:   appt.id,
      consultationId:  appt.consultation.id,
      doctorProfileId: profile.id,
      patientId:       appt.patientId,
      notes:           input.notes,
      durationSeconds,
      serviceFeeFcfa,
      videoFeeFcfa,
      prescriptionText: input.prescription,
    });

    await this.video.closeRoom(appt.consultation.videoSession?.providerRoomName ?? '');

    // SMS + push au patient
    this.notif.send({
      to:      appt.patient.phone,
      message: `Consultation terminée. Durée: ${minutes} min. Frais: ${serviceFeeFcfa.toLocaleString('fr-FR')} FCFA.`,
    });
    this.push.sendToUser(appt.patientId, {
      title: '✅ Consultation terminée',
      body:  `Durée : ${minutes} min — ${serviceFeeFcfa.toLocaleString('fr-FR')} FCFA à régler.`,
      data:  { type: 'consultation_complete', appointmentId: appt.id },
    });

    // Si ordonnance émise → notifier tout le personnel des pharmacies actives
    if (input.prescription && result.prescription) {
      const rxId = result.prescription.id;
      const pharmacyStaff = await prisma.user.findMany({
        where: {
          role:            UserRole.PARTNER_STAFF,
          partnerStaffOf:  { type: PartnerType.PHARMACY, isActive: true },
        },
        select: { id: true },
      });
      for (const staff of pharmacyStaff) {
        this.push.sendToUser(staff.id, {
          title: '💊 Nouvelle ordonnance',
          body:  'Un médecin vient d\'émettre une ordonnance numérique.',
          data:  { type: 'new_prescription', prescriptionId: rxId },
        });
      }
    }

    return {
      durationSeconds,
      durationMin:    minutes,
      videoFeeFcfa,
      serviceFeeFcfa,
      prescription:   result.prescription,
    };
  }

  async cancel(id: string, userId: string) {
    const appt = await this.repo.findById(id);
    if (!appt) throw HTTP.notFound('RDV introuvable');
    if (appt.patientId !== userId) throw HTTP.forbidden();
    const cancellable: string[] = [
      AppointmentStatus.PENDING,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.WAITING_ROOM,
    ];
    if (!cancellable.includes(appt.status)) {
      throw HTTP.unprocessable(`Impossible d'annuler un rendez-vous au statut « ${appt.status} »`);
    }
    return this.repo.cancel(id);
  }
}
