import { apiClient } from './client';

export interface DoctorListItem {
  id: string;
  name: string;
  specialty: string;
  consultationFeeFcfa: number;
  rating: number;
  reviewCount: number;
  isAvailableNow: boolean;
}

export interface TimeSlot {
  datetime: string;
  available: boolean;
}

export const doctorsService = {
  async list(params?: { specialty?: string; availableNow?: boolean }) {
    const res = await apiClient.get<{ data: DoctorListItem[] }>('/doctors', { params });
    return res.data.data;
  },

  async getSlots(doctorId: string, date: string) {
    const res = await apiClient.get<{ data: TimeSlot[] }>(`/doctors/${doctorId}/slots`, {
      params: { date },
    });
    return res.data.data;
  },
};
