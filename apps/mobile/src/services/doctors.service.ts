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

export interface DoctorSpecialty {
  id:   string;
  name: string;
}

export interface ScheduleSlot {
  dayOfWeek:    number;
  startTimeUtc: string;
  endTimeUtc:   string;
}

export interface DoctorProfile {
  id:                  string;
  cnomNumber:          string;
  specialtyId:         string;
  specialty:           DoctorSpecialty;
  bio:                 string | null;
  languages:           string[];
  consultationFeeFcfa: number;
  isAvailableNow:      boolean;
  verificationStatus:  string;
  availabilities:      (ScheduleSlot & { id: string; isActive: boolean })[];
}

export const doctorsService = {
  async list(params?: { specialty?: string; availableNow?: boolean }) {
    const res = await apiClient.get<{ data: DoctorListItem[] }>('/doctors', { params });
    return res.data.data;
  },

  async countAvailableNow(specialty?: string): Promise<{ count: number; available: boolean }> {
    const res = await apiClient.get<{ data: { count: number; available: boolean } }>(
      '/doctors/available-now/count',
      { params: specialty ? { specialty } : undefined },
    );
    return res.data.data;
  },

  async getSlots(doctorId: string, date: string) {
    const res = await apiClient.get<{ data: TimeSlot[] }>(`/doctors/${doctorId}/slots`, {
      params: { date },
    });
    return res.data.data;
  },

  async listSpecialties(): Promise<DoctorSpecialty[]> {
    const res = await apiClient.get<{ data: DoctorSpecialty[] }>('/doctors/specialties');
    return res.data.data;
  },

  async getMyProfile(): Promise<DoctorProfile> {
    const res = await apiClient.get<{ data: DoctorProfile }>('/doctors/me');
    return res.data.data;
  },

  async updateProfile(data: { specialtyId?: string; consultationFeeFcfa?: number; bio?: string; languages?: string[] }) {
    const res = await apiClient.patch<{ data: DoctorProfile }>('/doctors/me/profile', data);
    return res.data.data;
  },

  async updateSchedule(slots: ScheduleSlot[]) {
    const res = await apiClient.put<{ data: ScheduleSlot[] }>('/doctors/me/schedule', { slots });
    return res.data.data;
  },
};
