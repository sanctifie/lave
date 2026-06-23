import { apiClient } from './client';
import { PrescriptionType } from '@mbolo/shared';

export interface PrescriptionListItem {
  id: string;
  type: PrescriptionType;
  status: string;
  targetPartnerId: string | null;
  targetPartnerName: string | null;
  createdAt: string;
}

export interface PrescriptionDetail extends PrescriptionListItem {
  notes: string | null;
  mediaUrls: string[];
  items: Array<{ name: string; qty: number; unitPriceFcfa: number }>;
}

export const prescriptionsService = {
  async list(): Promise<PrescriptionListItem[]> {
    const { data } = await apiClient.get<{ data: PrescriptionListItem[] }>('/prescriptions');
    return data.data ?? data;
  },

  async getById(id: string): Promise<PrescriptionDetail> {
    const { data } = await apiClient.get<{ data: PrescriptionDetail }>(`/prescriptions/${id}`);
    return data.data ?? data;
  },

  async upload(params: {
    type: PrescriptionType;
    targetPartnerId: string;
    scan?: { uri: string; name: string; type: string };
  }): Promise<PrescriptionListItem> {
    const form = new FormData();
    form.append('type', params.type);
    form.append('targetPartnerId', params.targetPartnerId);
    if (params.scan) {
      form.append('scan', {
        uri:  params.scan.uri,
        name: params.scan.name,
        type: params.scan.type,
      } as unknown as Blob);
    }
    const { data } = await apiClient.post<{ data: PrescriptionListItem }>('/prescriptions', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data ?? data;
  },
};
