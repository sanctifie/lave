export enum UserRole {
  PATIENT = 'patient',
  ACCOMPAGNANT = 'accompagnant',
  COURIER = 'courier',
  PARTNER_STAFF = 'partner_staff',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
}

export enum PartnerType {
  PHARMACY = 'pharmacy',
  KITCHEN = 'kitchen',
  DEVICE_SUPPLIER = 'device_supplier',
  TRANSPORTER = 'transporter',
}

export enum VerificationStatus {
  PENDING_VERIFICATION = 'pending_verification',
  PENDING_MANUAL = 'pending_manual',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum PrescriptionSource {
  MANUAL = 'manual',
  TELECONSULTATION = 'teleconsultation',
}

export enum PrescriptionType {
  DRUG = 'drug',
  OSTEO = 'osteo',
}

export enum PrescriptionStatus {
  PENDING_VALIDATION = 'pending_validation',
  VALIDATED = 'validated',
  REJECTED = 'rejected',
  PARTIALLY_FILLED = 'partially_filled',
  FILLED = 'filled',
}

export enum OrderStatus {
  PENDING_PHARMACY = 'pending_pharmacy',
  PHARMACY_ACCEPTED = 'pharmacy_accepted',
  PHARMACY_REJECTED = 'pharmacy_rejected',
  PREPARING = 'preparing',
  READY_FOR_PICKUP = 'ready_for_pickup',
  DISPATCHED = 'dispatched',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum DeliveryStatus {
  PENDING_ASSIGNMENT = 'pending_assignment',
  ASSIGNED = 'assigned',
  EN_ROUTE_PICKUP = 'en_route_pickup',
  PICKED_UP = 'picked_up',
  EN_ROUTE_DELIVERY = 'en_route_delivery',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export enum TransactionKind {
  ESCROW = 'escrow',
  COD = 'cod',
  PAYOUT = 'payout',
  REFUND = 'refund',
}

export enum TransactionStatus {
  PENDING = 'pending',
  HELD = 'held',
  CAPTURED = 'captured',
  RELEASED = 'released',
  FAILED = 'failed',
}

export enum AppointmentType {
  IMMEDIATE = 'immediate',
  SCHEDULED = 'scheduled',
}

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  WAITING_ROOM = 'waiting_room',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum ConsultationStatus {
  WAITING_ROOM = 'waiting_room',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export enum RideType {
  HOME = 'home',
  HOSPITAL = 'hospital',
  EXAM = 'exam',
}

export enum RideStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  EN_ROUTE = 'en_route',
  ARRIVED = 'arrived',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PricingKind {
  DELIVERY_BASE = 'delivery_base',
  DELIVERY_PER_KM = 'delivery_per_km',
  SERVICE_FEE = 'service_fee',
  CONSULTATION_BASE_FEE = 'consultation_base_fee',
  VIDEO_USD_PER_PARTICIPANT_MIN = 'video_usd_per_participant_min',
  USD_TO_FCFA_RATE = 'usd_to_fcfa_rate',
  PLATFORM_COMMISSION_PCT = 'platform_commission_pct',
  MEAL_DELIVERY_FEE = 'meal_delivery_fee',
  RIDE_BASE_FEE = 'ride_base_fee',
  RIDE_PER_KM = 'ride_per_km',
}
