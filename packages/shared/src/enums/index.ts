export enum UserRole {
  PATIENT = 'patient',
  ACCOMPAGNANT = 'accompagnant',
  COURIER = 'courier',
  PARTNER_STAFF = 'partner_staff',
  ADMIN = 'admin',
}

export enum PartnerType {
  PHARMACY = 'pharmacy',
  KITCHEN = 'kitchen',
  DEVICE_SUPPLIER = 'device_supplier',
  TRANSPORTER = 'transporter',
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

export enum RideType {
  HOME = 'home',
  HOSPITAL = 'hospital',
  EXAM = 'exam',
}
