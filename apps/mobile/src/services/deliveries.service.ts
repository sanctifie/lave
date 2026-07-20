import { apiClient } from './client';

export interface DeliveryItem {
  id:              string;
  orderId:         string | null;
  status:          string;
  feeFcfa:         number;
  handoverCode:    string | null;
  paperStatus:     string;
  createdAt:       string;
  patientName:     string;
  patientPhone:    string;
  patientAddress:  string;
  pharmacyName:    string;
  pharmacyAddress: string;
  totalFcfa:       number;
  paymentMethod:   string;
  codDueFcfa:      number; // espèces à encaisser si COD
}

export interface DeliveryTracking {
  status:    string;
  updatedAt: string | null;
  courier:   { lat: number; lng: number; recordedAt: string } | null;
}

function normalize(raw: any): DeliveryItem {
  const phone = raw.order?.patient?.phone ?? '';
  return {
    id:              raw.id,
    orderId:         raw.orderId ?? null,
    status:          raw.status,
    feeFcfa:         raw.feeFcfa ?? 0,
    handoverCode:    raw.handoverCode ?? null,
    paperStatus:     raw.order?.paperStatus ?? 'none',
    createdAt:       raw.createdAt,
    patientName:     raw.order?.patient?.name  ?? '—',
    patientPhone:    phone,
    patientAddress:  phone ? `📞 ${phone}` : '—',
    pharmacyName:    raw.order?.partner?.legalName ?? '—',
    pharmacyAddress: raw.order?.partner?.landmark  ?? '—',
    totalFcfa:       raw.order?.totalFcfa ?? 0,
    paymentMethod:   raw.order?.paymentMethod ?? 'escrow',
    // Espèces à encaisser (part patient) : total médicaments − part caisse + frais.
    codDueFcfa:      Math.max(0, (raw.order?.totalFcfa ?? 0) - (raw.order?.caisseShareFcfa ?? 0))
                     + (raw.order?.serviceFeeFcfa ?? 0) + (raw.feeFcfa ?? 0),
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

  /** Stupéfiant — étape 1 : le coursier récupère l'original CHEZ LE PATIENT. */
  async paperCollected(orderId: string): Promise<void> {
    await apiClient.patch(`/orders/${orderId}/paper-collected`);
  },

  async confirmHandover(id: string, code: string): Promise<void> {
    await apiClient.post(`/deliveries/${id}/handover`, { code });
  },

  /** Coursier : pousse sa position GPS en direct (avec le statut courant). */
  async pushPosition(id: string, status: string, lat: number, lng: number): Promise<void> {
    await apiClient.patch(`/deliveries/${id}/position?lat=${lat}&lng=${lng}`, { status });
  },

  /** Patient/coursier : dernière position connue du coursier. */
  async getTracking(id: string): Promise<DeliveryTracking> {
    const { data } = await apiClient.get<{ data: DeliveryTracking }>(`/deliveries/${id}/tracking`);
    return data.data ?? (data as any);
  },

  async toggleAvailability(isAvailable: boolean): Promise<void> {
    await apiClient.patch('/deliveries/me/availability', { isAvailable });
  },

  async getAvailability(): Promise<boolean> {
    const { data } = await apiClient.get<{ data: { isAvailable: boolean } }>('/deliveries/me/availability');
    return (data.data ?? data).isAvailable ?? false;
  },
};
