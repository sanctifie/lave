import { apiClient } from './client';

export interface AppNotification {
  id:        string;
  title:     string;
  body:      string;
  type:      string | null;
  data:      Record<string, any> | null;
  readAt:    string | null;
  createdAt: string;
}

export const notificationsService = {
  async list(): Promise<AppNotification[]> {
    const { data } = await apiClient.get<{ data: AppNotification[] }>('/notifications');
    return data.data ?? (data as any);
  },

  async unreadCount(): Promise<number> {
    const { data } = await apiClient.get<{ data: { count: number } }>('/notifications/unread-count');
    return data.data?.count ?? 0;
  },

  async markRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },
};
