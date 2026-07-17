import { apiClient } from './client';
import { PrescriptionType, SubstitutionConsent } from '@mbolo/shared';

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
  rejectionReason: string | null;
  mediaUrls: string[];
  orderId: string | null;
  orderTotalFcfa: number | null;
}

export const prescriptionsService = {
  async list(): Promise<PrescriptionListItem[]> {
    const { data } = await apiClient.get<{ data: any[] }>('/prescriptions');
    const raw: any[] = data.data ?? (data as any);
    return raw.map((p) => ({
      id:                p.id,
      type:              p.type,
      status:            p.status,
      targetPartnerId:   p.targetPartnerId,
      targetPartnerName: p.targetPartner?.legalName ?? null,
      createdAt:         p.createdAt,
    }));
  },

  async getById(id: string): Promise<PrescriptionDetail> {
    const { data } = await apiClient.get<{ data: any }>(`/prescriptions/${id}`);
    const raw = data.data ?? data;
    return {
      id:                raw.id,
      type:              raw.type,
      status:            raw.status,
      targetPartnerId:   raw.targetPartnerId,
      targetPartnerName: raw.targetPartner?.legalName ?? null,
      createdAt:         raw.createdAt,
      notes:             raw.notes ?? null,
      rejectionReason:   raw.rejectionReason ?? null,
      mediaUrls:         (raw.media ?? []).map((m: any) => m.url as string),
      orderId:           raw.orders?.[0]?.id ?? null,
      orderTotalFcfa:    raw.orders?.[0]?.totalFcfa ?? null,
    };
  },

  async upload(params: {
    type: PrescriptionType;
    targetPartnerId: string;
    substitutionConsent?: SubstitutionConsent;
    scan?: { uri: string; name: string; type: string };
  }): Promise<PrescriptionListItem> {
    const form = new FormData();
    form.append('type', params.type);
    form.append('targetPartnerId', params.targetPartnerId);
    if (params.substitutionConsent) {
      form.append('substitutionConsent', params.substitutionConsent);
    }
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
