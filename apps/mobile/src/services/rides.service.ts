import { apiClient } from './client';

export interface RideRequest {
  id: string;
  patientId: string;
  type: 'home' | 'hospital' | 'exam';
  originLat: number; originLng: number; originLandmark: string;
  destLat: number; destLng: number; destLandmark: string;
  scheduledAt: string | null;
  notes: string | null;
  createdAt: string;
  ride: Ride | null;
}

export interface Ride {
  id: string;
  requestId: string;
  courierId: string | null;
  status: 'pending' | 'assigned' | 'en_route' | 'arrived' | 'completed' | 'cancelled';
  fareEstFcfa: number;
  fareFinalFcfa: number | null;
  startedAt: string | null;
  endedAt: string | null;
  request: RideRequest;
  delivery: { status: string; tracking: { lat: number; lng: number; recordedAt: string }[] } | null;
}

export interface RideEstimate {
  distanceKm: number;
  fareEstFcfa: number;
  baseFee: number;
  perKm: number;
}

export const ridesService = {
  async estimate(data: {
    originLat: number; originLng: number;
    destLat: number; destLng: number;
  }): Promise<RideEstimate> {
    const { data: res } = await apiClient.post('/rides/estimate', data);
    return res.data;
  },

  async request(data: {
    type: 'home' | 'hospital' | 'exam';
    originLat: number; originLng: number; originLandmark: string;
    destLat: number; destLng: number; destLandmark: string;
    scheduledAt?: string;
    notes?: string;
  }): Promise<Ride> {
    const { data: res } = await apiClient.post('/rides', data);
    return res.data;
  },

  async listMine(): Promise<RideRequest[]> {
    const { data } = await apiClient.get('/rides/mine');
    return data.data;
  },

  async getById(id: string): Promise<Ride> {
    const { data } = await apiClient.get(`/rides/${id}`);
    return data.data;
  },

  async listAvailable(): Promise<Ride[]> {
    const { data } = await apiClient.get('/rides/available');
    return data.data;
  },

  async accept(rideId: string): Promise<Ride> {
    const { data } = await apiClient.patch(`/rides/${rideId}/accept`);
    return data.data;
  },

  async updateStatus(rideId: string, status: string): Promise<Ride> {
    const { data } = await apiClient.patch(`/rides/${rideId}/status`, { status });
    return data.data;
  },
};
