import { apiClient as api } from './client';

export interface ConsultationPaymentStatus {
  consultationId: string;
  amountFcfa:     number;
  transaction: {
    id:     string;
    status: string;
    paidAt: string | null;
  } | null;
}

export interface ConsultationTransaction {
  id:             string;
  consultationId: string;
  amountFcfa:     number;
  status:         string;
  idempotencyKey: string;
  createdAt:      string;
}

export interface EscrowTransaction {
  id:        string;
  orderId:   string;
  amountFcfa: number;
  status:    string;
  createdAt: string;
}

export const paymentsService = {
  initEscrow: async (data: {
    orderId:     string;
    phoneNumber: string;
  }): Promise<EscrowTransaction> => {
    const r = await api.post('/payments/escrow', data);
    return r.data.data ?? r.data;
  },

  initConsultationPayment: async (data: {
    consultationId: string;
    phoneNumber:    string;
    operator:       'airtel' | 'moov';
  }): Promise<ConsultationTransaction> => {
    const r = await api.post('/payments/consultation', data);
    return r.data.data ?? r.data;
  },

  getConsultationStatus: async (consultationId: string): Promise<ConsultationPaymentStatus> => {
    const r = await api.get(`/payments/consultation/${consultationId}/status`);
    return r.data.data ?? r.data;
  },
};
