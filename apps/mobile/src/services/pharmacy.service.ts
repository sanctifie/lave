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
  // Tiers-payant : le patient est-il couvert par une caisse (CNAMGS/CNSS) ?
  // Détermine si le pharmacien doit cocher « remboursable » par article.
  insured: boolean;
}

export interface ValidationItem {
  name: string;
  quantity: number;
  unitPriceFcfa: number;
  // Substitution : cet article dispensé remplace-t-il un produit prescrit ?
  substituted?: boolean;
  originalName?: string;
  substitutionReason?: string;
  // Stupéfiant : inscription automatique à l'ordonnancier légal
  controlled?: boolean;
  // Sensible (antibiotique/dangereux/détournable) : collecte de l'original + cachet
  sensitive?: boolean;
  // Tiers-payant : article inscrit sur la liste CNAMGS des remboursables
  // (ouvre droit à la part caisse ; ignoré si le patient n'est pas assuré).
  reimbursable?: boolean;
}

// Conseil officinal (cross-sell) : produit conseil / OTC proposé en complément.
export interface RecommendationItem {
  name: string;
  quantity: number;
  unitPriceFcfa: number;
  note?: string;
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
  // Circuit stupéfiant : none | to_collect | collected | verified
  paperStatus: string;
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
    insured:     (raw.patient?.patientProfile?.insuranceProvider ?? 'none') !== 'none',
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
    paperStatus:    raw.paperStatus ?? 'none',
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

  async validate(
    id: string,
    items: ValidationItem[],
    recommendations: RecommendationItem[] = [],
    prescriberName?: string,
  ): Promise<void> {
    await apiClient.patch(`/prescriptions/${id}/validate`, {
      approved: true,
      ...(prescriberName ? { prescriberName } : {}),
      items: items.map((i) => ({
        name:          i.name,
        quantity:      i.quantity,
        unitPriceFcfa: i.unitPriceFcfa,
        ...(i.controlled ? { controlled: true } : {}),
        ...(i.sensitive ? { sensitive: true } : {}),
        ...(i.reimbursable ? { reimbursable: true } : {}),
        ...(i.substituted
          ? {
              substituted: true,
              originalName: i.originalName,
              substitutionReason: i.substitutionReason,
            }
          : {}),
      })),
      ...(recommendations.length
        ? {
            recommendations: recommendations.map((r) => ({
              name:          r.name,
              quantity:      r.quantity,
              unitPriceFcfa: r.unitPriceFcfa,
              ...(r.note ? { note: r.note } : {}),
            })),
          }
        : {}),
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

  /** Stupéfiant — étape 2 : original vérifié en main + n° d'ordonnancier inscrit. */
  async paperVerified(orderId: string): Promise<void> {
    await apiClient.patch(`/orders/${orderId}/paper-verified`);
  },

  // ── Business (tableau de bord, encaissements, tiers-payant, garde) ──────────
  async stats(): Promise<PharmacyStats> {
    const { data } = await apiClient.get<any>('/orders/partner/stats');
    return data.data ?? data;
  },

  async earnings(): Promise<PharmacyEarnings> {
    const { data } = await apiClient.get<any>('/orders/partner/earnings');
    return data.data ?? data;
  },

  async insuranceClaims(): Promise<InsuranceClaims> {
    const { data } = await apiClient.get<any>('/orders/partner/insurance-claims');
    return data.data ?? data;
  },

  /** Ordonnancier légal : registre des stupéfiants dispensés. */
  async register(): Promise<DispensingRecord[]> {
    const { data } = await apiClient.get<any>('/prescriptions/partner/register');
    return data.data ?? data;
  },

  async myProfile(): Promise<PartnerProfileLite> {
    const { data } = await apiClient.get<any>('/partners/me');
    return data.data ?? data;
  },

  async setDuty(isOnDuty: boolean, openingHours?: string | null): Promise<PartnerProfileLite> {
    const { data } = await apiClient.patch<any>('/partners/me/duty', { isOnDuty, ...(openingHours !== undefined ? { openingHours } : {}) });
    return data.data ?? data;
  },
};

export interface PharmacyStats {
  ordersCount: number;
  revenueFcfa: number;
  caisseFcfa: number;
  avgBasketFcfa: number;
  adviceCount: number;
  adviceRevenueFcfa: number;
  topProducts: { name: string; qty: number; revenueFcfa: number }[];
}

export interface PharmacyEarnings {
  releasedFcfa: number;
  escrowFcfa: number;
  pendingFcfa: number;
  rows: { orderId: string; dueFcfa: number; state: 'released' | 'escrow' | 'pending'; createdAt: string }[];
}

export interface InsuranceClaims {
  totalFcfa: number;
  count: number;
  byProvider: Record<string, number>;
  rows: {
    orderId: string;
    patientName: string;
    provider: string;
    coverageRate: number;
    caisseShareFcfa: number;
    totalFcfa: number;
    createdAt: string;
  }[];
}

export interface DispensingRecord {
  id: string;
  seq: number;
  patientName: string;
  medication: string;
  quantity: number;
  priceFcfa: number;
  prescriberName: string;
  createdAt: string;
}

export interface PartnerProfileLite {
  id: string;
  legalName: string;
  isOnDuty: boolean;
  openingHours: string | null;
}
