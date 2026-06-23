import { apiClient } from './client';

export interface DeliveryItem {
  id: string;
  orderId: string;
  patientName: string;
  patientAddress: string;
  pharmacyName: string;
  pharmacyAddress: string;
  status: string;
  handoverCode: string | null;
  totalFcfa: number;
  createdAt: string;
}

export const deliveriesService = {
  async list(): Promise<DeliveryItem[]> {
    const { data } = await apiClient.get<{ data: DeliveryItem[] }>('/deliveries');
    return data.data ?? data;
  },

  async getById(id: string): Promise<DeliveryItem> {
    const { data } = await apiClient.get<{ data: DeliveryItem }>(`/deliveries/${id}`);
    return data.data ?? data;
  },

  async updatePosition(id: string, lat: number, lng: number): Promise<void> {
    await apiClient.patch(`/deliveries/${id}/position`, { lat, lng });
  },

  async confirmHandover(id: string, code: string): Promise<void> {
    await apiClient.post(`/deliveries/${id}/handover`, { handoverCode: code });
  },
};
