import { apiClient } from './client';

export type AppointmentType = 'immediate' | 'scheduled';

export interface AppointmentListItem {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  type: AppointmentType;
  scheduledAt: string | null;
  status: string;
  feeFcfa: number;
}

export interface CreateAppointmentInput {
  doctorId: string;
  type: AppointmentType;
  scheduledAt?: string;
  chiefComplaint?: string;
}

export const appointmentsService = {
  async list() {
    const res = await apiClient.get<{ data: AppointmentListItem[] }>('/appointments');
    return res.data.data;
  },

  async create(input: CreateAppointmentInput) {
    const res = await apiClient.post<{ data: AppointmentListItem }>('/appointments', input);
    return res.data.data;
  },
};
