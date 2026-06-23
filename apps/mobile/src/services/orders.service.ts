import { apiClient } from './client';

export interface Order {
  id: string;
  status: string;
  totalFcfa: number;
  serviceFeeFcfa: number;
  pharmacyName?: string;
  createdAt: string;
  items: { id: string; name: string; quantity: number; unitPriceFcfa: number; totalFcfa: number }[];
  delivery: { status: string; handoverCode: string } | null;
}

export const ordersService = {
  async list(): Promise<Order[]> {
    const { data } = await apiClient.get('/orders');
    return data;
  },

  async getById(id: string): Promise<Order> {
    const { data } = await apiClient.get(`/orders/${id}`);
    return data;
  },
};
