import { apiClient } from './client';
import { API_URL } from './client';

export interface InboxPrescription {
  id: string;
  patientName: string;
  createdAt: string;
  status: string;
  type: string;
  mediaUrls: string[];
  notes: string | null;
  allergies: string[];
}

export interface ValidationItem {
  name: string;
  quantity: number;
  unitPriceFcfa: number;
  // Substitution : cet article dispensé remplace-t-il un produit prescrit ?
  substituted?: boolean;
  originalName?: string;
  substitutionReason?: string;
}

export interface PharmacyOrderItem {
  name: string;
  quantity: number;
  unitPriceFcfa: number;
  totalFcfa: number;
}

export interface PharmacyOrder {
  id: string;
  prescriptionId: string;
  patientName: string;
  status: string;
  totalFcfa: number;
  createdAt: string;
  items: PharmacyOrderItem[];
}

function normalizeRx(raw: any): InboxPrescription {
  return {
    id:          raw.id,
    patientName: raw.patient?.name ?? raw.patientName ?? '—',
    createdAt:   raw.createdAt,
    status:      raw.status,
    type:        raw.type,
    notes:       raw.notes ?? null,
    allergies:   raw.patient?.patientProfile?.allergies ?? [],
    mediaUrls:   (raw.media ?? []).map((m: any) =>
      (m.url as string).startsWith('http') ? m.url : `${API_URL}${m.url}`
    ),
  };
}

function normalizeOrder(raw: any): PharmacyOrder {
  return {
    id:             raw.id,
    prescriptionId: raw.prescriptionId,
    patientName:    raw.patient?.name ?? raw.patientName ?? '—',
    status:         raw.status,
    totalFcfa:      raw.totalFcfa,
    createdAt:      raw.createdAt,
    items:          (raw.items ?? []).map((i: any) => ({
      name:          i.name,
      quantity:      i.quantity,
      unitPriceFcfa: i.unitPriceFcfa,
      totalFcfa:     i.totalFcfa ?? i.quantity * i.unitPriceFcfa,
    })),
  };
}

export const pharmacyService = {
  async inbox(): Promise<InboxPrescription[]> {
    const { data } = await apiClient.get<any>('/prescriptions/partner/inbox');
    const raw: any[] = data.data ?? data;
    return raw.map(normalizeRx);
  },

  async getById(id: string): Promise<InboxPrescription> {
    const { data } = await apiClient.get<any>(`/prescriptions/partner/${id}`);
    const raw = data.data ?? data;
    return normalizeRx(raw);
  },

  async validate(id: string, items: ValidationItem[]): Promise<void> {
    await apiClient.patch(`/prescriptions/${id}/validate`, {
      approved: true,
      items: items.map((i) => ({
        name:          i.name,
        quantity:      i.quantity,
        unitPriceFcfa: i.unitPriceFcfa,
        ...(i.substituted
          ? {
              substituted: true,
              originalName: i.originalName,
              substitutionReason: i.substitutionReason,
            }
          : {}),
      })),
    });
  },

  async reject(id: string, rejectionReason: string): Promise<void> {
    await apiClient.patch(`/prescriptions/${id}/validate`, {
      approved: false,
      rejectionReason,
    });
  },

  async listOrders(): Promise<PharmacyOrder[]> {
    const { data } = await apiClient.get<any>('/orders/partner/list');
    const raw: any[] = data.data ?? data;
    return raw.map(normalizeOrder);
  },

  async orderAction(orderId: string, action: 'prepare' | 'ready' | 'reject', reason?: string): Promise<void> {
    await apiClient.patch(`/orders/${orderId}/pharmacy-action`, { action, reason });
  },
};
