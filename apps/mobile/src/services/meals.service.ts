import { apiClient } from './client';

export interface MealPlanItem {
  id: string;
  name: string;
  unitPriceFcfa: number;
  isAvailable: boolean;
}

export interface MealPlan {
  id: string;
  partnerId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  items: MealPlanItem[];
}

export interface MealOrder {
  id: string;
  patientId: string;
  mealPlanId: string;
  totalFcfa: number;
  deliveryFeeFcfa: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  mealPlan: { name: string; partnerId?: string };
  delivery: { status: string } | null;
}

export const mealsService = {
  async listPlans(partnerId?: string): Promise<MealPlan[]> {
    const { data } = await apiClient.get('/meals/plans', { params: partnerId ? { partnerId } : {} });
    return data.data;
  },

  async getPlan(id: string): Promise<MealPlan> {
    const { data } = await apiClient.get(`/meals/plans/${id}`);
    return data.data;
  },

  async placeOrder(mealPlanId: string, notes?: string): Promise<MealOrder> {
    const { data } = await apiClient.post('/meals/orders', { mealPlanId, notes });
    return data.data;
  },

  async listMine(): Promise<MealOrder[]> {
    const { data } = await apiClient.get('/meals/orders/mine');
    return data.data;
  },

  async getOrder(id: string): Promise<MealOrder> {
    const { data } = await apiClient.get(`/meals/orders/${id}`);
    return data.data;
  },
};
