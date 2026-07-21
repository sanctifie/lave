import { apiClient } from './client';

export interface PharmacyDirItem {
  id:             string;
  legalName:      string;
  landmark:       string;
  phone:          string;
  whatsappNumber: string | null;
  lat:            number | null;
  lng:            number | null;
  isOnDuty:       boolean;
  openingHours:   string | null;
  rating:         number | null;
  reviewCount:    number;
}

function normalize(raw: any): PharmacyDirItem {
  return {
    id:             raw.id,
    legalName:      raw.legalName ?? '—',
    landmark:       raw.landmark ?? '',
    phone:          raw.phone ?? '',
    whatsappNumber: raw.whatsappNumber ?? null,
    lat:            raw.lat != null ? Number(raw.lat) : null,
    lng:            raw.lng != null ? Number(raw.lng) : null,
    isOnDuty:       !!raw.isOnDuty,
    openingHours:   raw.openingHours ?? null,
    rating:         raw.rating != null ? Number(raw.rating) : null,
    reviewCount:    raw.reviewCount ?? 0,
  };
}

export const partnersService = {
  /** Annuaire des pharmacies (de garde mises en avant côté serveur). */
  async listPharmacies(): Promise<PharmacyDirItem[]> {
    const { data } = await apiClient.get<{ data: any[] }>('/partners', { params: { type: 'pharmacy' } });
    return (data.data ?? data).map(normalize);
  },
};

/** Distance à vol d'oiseau en km entre deux points GPS (Haversine). */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
