import { HTTP } from '../../lib/errors';
import { AppointmentRepository } from './repository';
import { DoctorRepository } from '../doctors/repository';
import { PricingRepository } from '../pricing/repository';
import { VideoProvider } from '../../infrastructure/providers/video';
import { NotificationService } from '../../infrastructure/providers/notification';
import { CreateAppointmentInput, CompleteConsultationInput } from './schema';
import { AppointmentType, AppointmentStatus, UserRole } from '@mbolo/shared';
import { PricingKind } from '@mbolo/shared';

export class AppointmentService {
  constructor(
    private readonly repo:     AppointmentRepository,
    private readonly doctorRepo: DoctorRepository,
    private readonly pricingRepo: PricingRepository,
    private readonly video:    VideoProvider,
    private readonly notif:    NotificationService,
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
      const available = await this.doctorRepo.listAvailableNow() as any[];
      if (available.length === 0) throw HTTP.unprocessable('Aucun médecin disponible en ce moment');
      const doctor = available[0];
      const appt = await this.repo.create({
        patientId,
        doctorId:       doctor.id as string,
        type:           input.type as string,
        chiefComplaint: (input as any).chiefComplaint,
      });
      this.notif.send({ to: doctor.user.phone, message: `Nouvelle consultation immédiate — patient en attente.` });
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
    return appt;
  }

  /** Médecin démarre : crée la session vidéo Daily.co, notifie le patient */
  async start(appointmentId: string, doctorUserId: string) {
    const appt = await this.repo.findById(appointmentId);
    if (!appt) throw HTTP.notFound('RDV introuvable');
    if (appt.status !== AppointmentStatus.PENDING && appt.status !== AppointmentStatus.CONFIRMED) {
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

    this.notif.send({
      to:      appt.patient.phone,
      message: `Votre médecin est prêt. Rejoignez la consultation : ${room.roomUrl}`,
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

    // Frais vidéo depuis pricing table
    const [rateEntry, fxEntry, baseFeeEntry] = await Promise.all([
      this.pricingRepo.getByKind(PricingKind.VIDEO_USD_PER_PARTICIPANT_MIN),
      this.pricingRepo.getByKind(PricingKind.USD_TO_FCFA_RATE),
      this.pricingRepo.getByKind(PricingKind.CONSULTATION_BASE_FEE),
    ]);
    const rateUsd       = Number(rateEntry?.valueNum  ?? 0.00099);
    const fxRate        = Number(fxEntry?.valueNum    ?? 600);
    const baseFee       = Number(baseFeeEntry?.valueFcfa ?? profile.consultationFeeFcfa);
    const minutes       = Math.ceil(durationSeconds / 60);
    const videoFeeFcfa  = Math.ceil(minutes * 2 * rateUsd * fxRate);
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

    this.notif.send({
      to:      appt.patient.phone,
      message: `Consultation terminée. Durée: ${minutes} min. Frais: ${serviceFeeFcfa.toLocaleString('fr-FR')} FCFA.`,
    });

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
    if (appt.status === AppointmentStatus.IN_PROGRESS) {
      throw HTTP.unprocessable('Impossible d\'annuler une consultation en cours');
    }
    return this.repo.cancel(id);
  }
}
