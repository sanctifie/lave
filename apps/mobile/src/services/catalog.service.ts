import { apiClient } from './client';

export interface Product {
  id: string;
  name: string;
  barcode: string | null;
  priceFcfa: number;
  inStock: boolean;
  isAdvice: boolean;
  sensitive: boolean;
}

function normalize(raw: any): Product {
  return {
    id:        raw.id,
    name:      raw.name,
    barcode:   raw.barcode ?? null,
    priceFcfa: raw.priceFcfa,
    inStock:   raw.inStock ?? true,
    isAdvice:  raw.isAdvice ?? false,
    sensitive: raw.sensitive ?? false,
  };
}

export const catalogService = {
  async list(params: { q?: string; adviceOnly?: boolean } = {}): Promise<Product[]> {
    const { data } = await apiClient.get<any>('/partners/me/products', { params });
    const raw: any[] = data.data ?? data;
    return raw.map(normalize);
  },

  /** Recherche par code-barres (scan). Retourne null si aucun produit ne correspond. */
  async byBarcode(code: string): Promise<Product | null> {
    try {
      const { data } = await apiClient.get<any>(`/partners/me/products/barcode/${encodeURIComponent(code)}`);
      return normalize(data.data ?? data);
    } catch {
      return null;
    }
  },

  async create(input: {
    name: string;
    priceFcfa: number;
    barcode?: string | null;
    inStock?: boolean;
    isAdvice?: boolean;
    sensitive?: boolean;
  }): Promise<Product> {
    const { data } = await apiClient.post<any>('/partners/me/products', input);
    return normalize(data.data ?? data);
  },

  async update(id: string, input: Partial<Omit<Product, 'id'>>): Promise<Product> {
    const { data } = await apiClient.patch<any>(`/partners/me/products/${id}`, input);
    return normalize(data.data ?? data);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/partners/me/products/${id}`);
  },
};
