import { apiClient } from './client';

export interface CareLink {
  id:        string;   // id du lien
  userId:    string;   // id de l'autre partie (aidant ou patient)
  status:    'pending' | 'accepted' | 'revoked';
  createdAt: string;
  name:      string;
  phone:     string | null;
}

export interface CareLinks {
  caregivers: CareLink[]; // mes aidants (comptes que j'ai invités)
  patients:   CareLink[]; // comptes que je gère (patients qui m'ont invité)
}

export interface ManagedOrder {
  id:           string;
  status:       string;
  totalFcfa:    number;
  createdAt:    string;
  pharmacyName: string | null;
}

export const careLinksService = {
  async list(): Promise<CareLinks> {
    const { data } = await apiClient.get<{ data: CareLinks }>('/care-links');
    const d = data.data ?? (data as any);
    return { caregivers: d.caregivers ?? [], patients: d.patients ?? [] };
  },

  /** Patient : invite un accompagnant par téléphone. */
  async invite(caregiverPhone: string): Promise<void> {
    await apiClient.post('/care-links', { caregiverPhone });
  },

  /** Accompagnant : accepte une invitation. */
  async accept(id: string): Promise<void> {
    await apiClient.patch(`/care-links/${id}/accept`);
  },

  /** Patient ou accompagnant : rompt le lien. */
  async revoke(id: string): Promise<void> {
    await apiClient.patch(`/care-links/${id}/revoke`);
  },

  /** Accompagnant : commandes d'un patient géré. */
  async patientOrders(patientId: string): Promise<ManagedOrder[]> {
    const { data } = await apiClient.get<{ data: any[] }>(`/care-links/patients/${patientId}/orders`);
    const raw = data.data ?? (data as any);
    return raw.map((o: any) => ({
      id:           o.id,
      status:       o.status,
      totalFcfa:    o.totalFcfa ?? 0,
      createdAt:    o.createdAt,
      pharmacyName: o.partner?.legalName ?? null,
    }));
  },
};
