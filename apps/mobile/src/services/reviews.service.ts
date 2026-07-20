import { apiClient } from './client';

export type ReviewTarget = 'partner_profiles' | 'doctor_profiles' | 'couriers';

export interface ReviewSummary {
  average: number | null;
  count: number;
  recent: { rating: number; comment: string | null; createdAt: string; authorName: string }[];
}

export const reviewsService = {
  async summary(refTable: ReviewTarget, refId: string): Promise<ReviewSummary> {
    const { data } = await apiClient.get<any>('/reviews/summary', { params: { refTable, refId } });
    return data.data ?? data;
  },

  async create(input: { refTable: ReviewTarget; refId: string; rating: number; comment?: string }): Promise<void> {
    await apiClient.post('/reviews', input);
  },
};
