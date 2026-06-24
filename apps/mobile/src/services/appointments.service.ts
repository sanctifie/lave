import { apiClient } from './client';

export type AppointmentType = 'immediate' | 'scheduled';

export interface AppointmentListItem {
  id:              string;
  doctorName:      string;
  doctorSpecialty: string;
  type:            AppointmentType;
  scheduledAt:     string | null;
  status:          string;
  feeFcfa:         number;
}

export interface ConsultationDetail {
  id:              string;
  status:          string;
  notes:           string | null;
  durationSeconds: number | null;
  serviceFeeFcfa:  number | null;
  videoFeeFcfa:    number | null;
  startedAt:       string | null;
  endedAt:         string | null;
  prescription:    { id: string; notes: string | null } | null;
  transaction:     { id: string; status: string; paidAt: string | null } | null;
}

export interface AppointmentDetail {
  id:           string;
  type:         AppointmentType;
  status:       string;
  scheduledAt:  string | null;
  notes:        string | null;
  doctor: {
    id:       string;
    user:     { name: string };
    specialty: { name: string };
    consultationFeeFcfa: number;
  };
  patient:      { name: string };
  consultation: ConsultationDetail | null;
}

export interface CreateAppointmentInput {
  doctorId?:       string;
  type:            AppointmentType;
  scheduledAt?:    string;
  chiefComplaint?: string;
  specialty?:      string;
}

export const appointmentsService = {
  async list() {
    const res = await apiClient.get<{ data: AppointmentListItem[] }>('/appointments');
    return res.data.data;
  },

  async getById(id: string): Promise<AppointmentDetail> {
    const res = await apiClient.get<{ data: AppointmentDetail }>(`/appointments/${id}`);
    return res.data.data ?? (res.data as any);
  },

  async create(input: CreateAppointmentInput) {
    const res = await apiClient.post<{ data: AppointmentListItem }>('/appointments', input);
    return res.data.data;
  },

  async cancel(id: string) {
    const res = await apiClient.patch<{ data: AppointmentListItem }>(`/appointments/${id}/cancel`);
    return res.data.data ?? (res.data as any);
  },
};
