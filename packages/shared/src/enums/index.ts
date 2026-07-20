export enum MediaKind {
  PRESCRIPTION_SCAN = 'prescription_scan',
  ID_DOCUMENT = 'id_document',
  PROFILE_PHOTO = 'profile_photo',
  COURIER_PHOTO = 'courier_photo',
  DOCTOR_CREDENTIAL = 'doctor_credential',
}

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
  // Conseil au comptoir : le patient décrit ses symptômes, sans ordonnance ;
  // le pharmacien répond par des produits conseil (jamais de stupéfiants).
  ADVICE = 'advice',
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
  // Le pharmacien a proposé un/des équivalent(s) : on attend l'accord du patient
  // avant de préparer (uniquement si son consentement était « me demander »).
  PENDING_SUBSTITUTION = 'pending_substitution',
  PHARMACY_ACCEPTED = 'pharmacy_accepted',
  PHARMACY_REJECTED = 'pharmacy_rejected',
  PREPARING = 'preparing',
  READY_FOR_PICKUP = 'ready_for_pickup',
  DISPATCHED = 'dispatched',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

/**
 * Consentement du patient à recevoir un équivalent (générique / thérapeutique)
 * si le médicament exact est indisponible. Choisi à l'envoi de l'ordonnance.
 * Le pharmacien reste le seul à décider de l'équivalence (dispensateur légal).
 */
export enum SubstitutionConsent {
  ALLOW = 'allow', // accepte tout équivalent proposé par le pharmacien
  ASK = 'ask',     // me demander à chaque fois (défaut)
  DENY = 'deny',   // produit exact uniquement, aucune substitution
}

/** État d'un article dispensé vis-à-vis d'une éventuelle substitution. */
export enum SubstitutionStatus {
  NONE = 'none',                   // article conforme à l'ordonnance
  PENDING = 'pending',             // équivalent proposé, en attente d'accord patient
  ACCEPTED = 'accepted',           // équivalent accepté par le patient
  AUTO_ACCEPTED = 'auto_accepted', // équivalent accepté d'office (consentement = allow)
  REJECTED = 'rejected',           // équivalent refusé par le patient
}

/**
 * Nature d'un article de commande.
 * - PRESCRIBED : article issu de l'ordonnance (dispensé par le pharmacien).
 * - RECOMMENDED : conseil officinal (produit conseil / OTC) proposé par le
 *   pharmacien en complément. Jamais un médicament de substitution, jamais
 *   imposé : le patient l'ajoute librement avant paiement.
 */
export enum OrderItemKind {
  PRESCRIBED = 'prescribed',
  RECOMMENDED = 'recommended',
}

/** État d'un article recommandé (conseil officinal) vis-à-vis du patient. */
export enum RecommendationStatus {
  NONE = 'none',           // article non concerné (article prescrit)
  SUGGESTED = 'suggested', // conseillé par le pharmacien, en attente du choix patient
  ACCEPTED = 'accepted',   // ajouté à la commande par le patient
  DECLINED = 'declined',   // écarté par le patient
}

/**
 * Assurance maladie du patient pour le tiers-payant.
 * - CNAMGS : Caisse Nationale d'Assurance Maladie et de Garantie Sociale (Gabon).
 * - CNSS : Caisse Nationale de Sécurité Sociale.
 * Le tiers-payant répartit QUI paie (assuré / caisse) sans jamais modifier le
 * prix du médicament — aucune marge plateforme n'est ajoutée.
 */
export enum InsuranceProvider {
  NONE = 'none',
  CNAMGS = 'cnamgs',
  CNSS = 'cnss',
}

/** Circuit de l'ordonnance papier originale (stupéfiants) : l'étiquette
 * d'annotation voyage avec le colis, le patient conserve son original annoté. */
export enum PaperStatus {
  NONE = 'none',
  TO_COLLECT = 'to_collect',   // récupérer l'original chez le patient (étape 1)
  COLLECTED = 'collected',     // en route vers l'officine (étape 2)
  VERIFIED = 'verified',       // vérifié + annoté par le pharmacien, scellé au colis (étape 3)
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

/** Mode de paiement d'une commande. */
export enum PaymentMethod {
  ESCROW = 'escrow', // Mobile Money bloqué en séquestre (défaut)
  COD = 'cod',       // paiement à la livraison, en espèces au coursier
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
  // Course stupéfiant (boucle patient → officine → patient) : tarif majoré
  CONTROLLED_DELIVERY_FEE = 'controlled_delivery_fee',
}
