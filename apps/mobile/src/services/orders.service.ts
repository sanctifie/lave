import { apiClient } from './client';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPriceFcfa: number;
  totalFcfa: number;
  substitutionStatus: string;
  originalName: string | null;
  substitutionReason: string | null;
  kind: string;
  recommendationStatus: string;
  recommendationNote: string | null;
}

export interface Order {
  id: string;
  status: string;
  totalFcfa: number;
  serviceFeeFcfa: number;
  pharmacyName: string | null;
  createdAt: string;
  items: OrderItem[];
  // handoverCode absent volontairement : le code de remise est détenu par le
  // coursier, le patient le saisit à la réception.
  delivery: { status: string } | null;
}

export interface OrderDetail extends Order {
  deliveryId: string | null;
  deliveryStatus: string | null;
  deliveryFeeFcfa: number | null;
  /** Code de remise du patient : il le MONTRE au coursier, qui le saisit. */
  handoverCode: string | null;
  transactionStatus: string | null;
  insuranceProvider: string;
  insuranceCoverageRate: number;
  caisseShareFcfa: number;
}

function normalizeItem(i: any): OrderItem {
  return {
    id:                 i.id,
    name:               i.name,
    quantity:           i.quantity,
    unitPriceFcfa:      i.unitPriceFcfa,
    totalFcfa:          i.totalFcfa,
    substitutionStatus: i.substitutionStatus ?? 'none',
    originalName:       i.originalName ?? null,
    substitutionReason: i.substitutionReason ?? null,
    kind:                 i.kind ?? 'prescribed',
    recommendationStatus: i.recommendationStatus ?? 'none',
    recommendationNote:   i.recommendationNote ?? null,
  };
}

export const ordersService = {
  async list(): Promise<Order[]> {
    const { data } = await apiClient.get<any>('/orders');
    const raw: any[] = data.data ?? data;
    return raw.map((o) => ({
      id:             o.id,
      status:         o.status,
      totalFcfa:      o.totalFcfa,
      serviceFeeFcfa: o.serviceFeeFcfa,
      pharmacyName:   o.partner?.legalName ?? null,
      createdAt:      o.createdAt,
      items:          (o.items ?? []).map(normalizeItem),
      delivery:       o.delivery ?? null,
    }));
  },

  async getById(id: string): Promise<OrderDetail> {
    const { data } = await apiClient.get<any>(`/orders/${id}`);
    const raw = data.data ?? data;
    return {
      id:                raw.id,
      status:            raw.status,
      totalFcfa:         raw.totalFcfa,
      serviceFeeFcfa:    raw.serviceFeeFcfa,
      pharmacyName:      raw.partner?.legalName ?? null,
      createdAt:         raw.createdAt,
      items:             (raw.items ?? []).map(normalizeItem),
      delivery:          raw.delivery ?? null,
      deliveryId:        raw.delivery?.id ?? null,
      deliveryStatus:    raw.delivery?.status ?? null,
      // Champ Prisma : feeFcfa (l'ancien mapping deliveryFeeFcfa était toujours null)
      deliveryFeeFcfa:   raw.delivery?.feeFcfa ?? raw.delivery?.deliveryFeeFcfa ?? null,
      handoverCode:      raw.delivery?.handoverCode ?? null,
      transactionStatus: raw.transaction?.status ?? null,
      insuranceProvider:     raw.insuranceProvider ?? 'none',
      insuranceCoverageRate: raw.insuranceCoverageRate ?? 0,
      caisseShareFcfa:       raw.caisseShareFcfa ?? 0,
    };
  },

  /** Le patient accepte/refuse les équivalents proposés (par article). */
  async decideSubstitution(
    orderId: string,
    decisions: { itemId: string; accepted: boolean }[],
  ): Promise<{ cancelled: boolean }> {
    const { data } = await apiClient.patch<any>(`/orders/${orderId}/substitution-decision`, { decisions });
    const raw = data.data ?? data;
    return { cancelled: !!raw.cancelled };
  },

  /** Le patient ajoute/écarte les conseils officinaux proposés (par article). */
  async decideRecommendation(
    orderId: string,
    decisions: { itemId: string; accepted: boolean }[],
  ): Promise<{ totalFcfa: number }> {
    const { data } = await apiClient.patch<any>(`/orders/${orderId}/recommendation-decision`, { decisions });
    const raw = data.data ?? data;
    return { totalFcfa: raw.totalFcfa ?? raw.order?.totalFcfa ?? 0 };
  },
};
