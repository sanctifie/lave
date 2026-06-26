import { apiClient } from './client';
import { UserRole } from '@mbolo/shared';

export interface AuthUser {
  id: string;
  phone: string;
  role: UserRole;
  name: string;
}

export interface VerifyOtpResponse {
  token: string;
  user: AuthUser;
}

export const authService = {
  async requestOtp(phone: string): Promise<{ expiresIn: number }> {
    const { data } = await apiClient.post('/auth/otp/request', { phone });
    return data;
  },

  async verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
    const { data } = await apiClient.post('/auth/otp/verify', { phone, code });
    return data;
  },
};
