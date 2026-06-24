import { apiClient } from './client';

export interface DeliveryItem {
  id:              string;
  orderId:         string | null;
  status:          string;
  feeFcfa:         number;
  handoverCode:    string | null;
  createdAt:       string;
  patientName:     string;
  patientPhone:    string;
  pharmacyName:    string;
  pharmacyAddress: string;
  totalFcfa:       number;
}

function normalize(raw: any): DeliveryItem {
  return {
    id:              raw.id,
    orderId:         raw.orderId ?? null,
    status:          raw.status,
    feeFcfa:         raw.feeFcfa ?? 0,
    handoverCode:    raw.handoverCode ?? null,
    createdAt:       raw.createdAt,
    patientName:     raw.order?.patient?.name  ?? '—',
    patientPhone:    raw.order?.patient?.phone ?? '',
    pharmacyName:    raw.order?.partner?.legalName ?? '—',
    pharmacyAddress: raw.order?.partner?.landmark  ?? '—',
    totalFcfa:       raw.order?.totalFcfa ?? 0,
  };
}

export const deliveriesService = {
  async list(): Promise<DeliveryItem[]> {
    const { data } = await apiClient.get<{ data: any[] }>('/deliveries');
    return (data.data ?? data).map(normalize);
  },

  async getById(id: string): Promise<DeliveryItem> {
    const { data } = await apiClient.get<{ data: any }>(`/deliveries/${id}`);
    return normalize(data.data ?? data);
  },

  async accept(id: string): Promise<void> {
    await apiClient.patch(`/deliveries/${id}/accept`);
  },

  async updateStatus(id: string, status: string): Promise<void> {
    await apiClient.patch(`/deliveries/${id}/status`, { status });
  },

  async confirmHandover(id: string, code: string): Promise<void> {
    await apiClient.post(`/deliveries/${id}/handover`, { code });
  },

  async toggleAvailability(isAvailable: boolean): Promise<void> {
    await apiClient.patch('/deliveries/me/availability', { isAvailable });
  },
};
