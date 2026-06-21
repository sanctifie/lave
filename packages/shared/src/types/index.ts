export interface GpsCoordinates {
  lat: number;
  lng: number;
}

export interface Address {
  coordinates: GpsCoordinates;
  landmark: string;
  whatsappNumber?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
