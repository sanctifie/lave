import { apiClient } from './client';

export interface InboxPrescription {
  id: string;
  patientName: string;
  createdAt: string;
  status: string;
  type: string;
  mediaUrls: string[];
  notes: string | null;
}

export interface ValidationItem {
  name: string;
  quantity: number;
  unitPriceFcfa: number;
}

export interface PharmacyOrder {
  id: string;
  prescriptionId: string;
  patientName: string;
  status: string;
  totalFcfa: number;
  createdAt: string;
  items: ValidationItem[];
}

export const pharmacyService = {
  async inbox(): Promise<InboxPrescription[]> {
    const { data } = await apiClient.get<{ data: InboxPrescription[] }>('/prescriptions/partner/inbox');
    return data.data ?? data;
  },

  async getById(id: string): Promise<InboxPrescription> {
    const { data } = await apiClient.get<{ data: InboxPrescription }>(`/prescriptions/${id}`);
    return data.data ?? data;
  },

  async validate(id: string, items: ValidationItem[]): Promise<void> {
    await apiClient.patch(`/prescriptions/${id}/validate`, { items });
  },

  async reject(id: string, reason: string): Promise<void> {
    await apiClient.patch(`/prescriptions/${id}/validate`, { rejected: true, reason });
  },

  async listOrders(): Promise<PharmacyOrder[]> {
    const { data } = await apiClient.get<{ data: PharmacyOrder[] }>('/orders/partner/list');
    return data.data ?? data;
  },

  async orderAction(orderId: string, action: 'prepare' | 'ready' | 'reject'): Promise<void> {
    await apiClient.patch(`/orders/${orderId}/pharmacy-action`, { action });
  },
};
