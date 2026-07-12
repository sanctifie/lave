import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { OrderStatus, DeliveryStatus, PrescriptionStatus, AppointmentStatus } from '@mbolo/shared';
import { fr } from '../../i18n/fr';

type BadgeStatus =
  | OrderStatus
  | DeliveryStatus
  | PrescriptionStatus
  | AppointmentStatus
  | string;

type BadgeColor = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const STATUS_CONFIG: Record<string, { label: string; color: BadgeColor }> = {
  // Prescription
  [PrescriptionStatus.PENDING_VALIDATION]: { label: fr.prescription.status.pending_validation, color: 'warning' },
  [PrescriptionStatus.VALIDATED]:           { label: fr.prescription.status.validated,           color: 'success' },
  [PrescriptionStatus.REJECTED]:            { label: fr.prescription.status.rejected,             color: 'error'   },
  [PrescriptionStatus.PARTIALLY_FILLED]:    { label: fr.prescription.status.partially_filled,     color: 'info'    },
  [PrescriptionStatus.FILLED]:              { label: fr.prescription.status.filled,               color: 'success' },

  // Order
  [OrderStatus.PENDING_PHARMACY]:   { label: fr.order.status.pending_pharmacy,   color: 'warning' },
  [OrderStatus.PHARMACY_ACCEPTED]:  { label: fr.order.status.pharmacy_accepted,  color: 'info'    },
  [OrderStatus.PHARMACY_REJECTED]:  { label: fr.order.status.pharmacy_rejected,  color: 'error'   },
  [OrderStatus.PREPARING]:          { label: fr.order.status.preparing,           color: 'info'    },
  [OrderStatus.READY_FOR_PICKUP]:   { label: fr.order.status.ready_for_pickup,   color: 'info'    },
  [OrderStatus.DISPATCHED]:         { label: fr.order.status.dispatched,          color: 'info'    },
  // 'delivered' et 'cancelled' sont partagés avec DeliveryStatus/AppointmentStatus
  // (mêmes valeurs littérales) — définis plus bas, une seule fois.

  // Delivery
  [DeliveryStatus.PENDING_ASSIGNMENT]: { label: fr.delivery.status.pending_assignment, color: 'warning' },
  [DeliveryStatus.ASSIGNED]:           { label: fr.delivery.status.assigned,           color: 'info'    },
  [DeliveryStatus.EN_ROUTE_PICKUP]:    { label: fr.delivery.status.en_route_pickup,    color: 'info'    },
  [DeliveryStatus.PICKED_UP]:          { label: fr.delivery.status.picked_up,          color: 'info'    },
  [DeliveryStatus.EN_ROUTE_DELIVERY]:  { label: fr.delivery.status.en_route_delivery,  color: 'info'    },
  [DeliveryStatus.DELIVERED]:          { label: fr.delivery.status.delivered,           color: 'success' },
  [DeliveryStatus.FAILED]:             { label: fr.delivery.status.failed,              color: 'error'   },

  // Appointment
  [AppointmentStatus.PENDING]:      { label: fr.appointment.status.pending,      color: 'warning' },
  [AppointmentStatus.CONFIRMED]:    { label: fr.appointment.status.confirmed,    color: 'info'    },
  [AppointmentStatus.WAITING_ROOM]: { label: fr.appointment.status.waiting_room, color: 'warning' },
  [AppointmentStatus.IN_PROGRESS]:  { label: fr.appointment.status.in_progress,  color: 'info'    },
  [AppointmentStatus.COMPLETED]:    { label: fr.appointment.status.completed,    color: 'success' },
  [AppointmentStatus.CANCELLED]:    { label: fr.appointment.status.cancelled,    color: 'neutral' },
  [AppointmentStatus.NO_SHOW]:      { label: fr.appointment.status.no_show,      color: 'error'   },
};

const COLOR_STYLES: Record<BadgeColor, { bg: string; text: string }> = {
  success: { bg: colors.successSurface, text: colors.success },
  warning: { bg: colors.warningSurface, text: colors.warning },
  error:   { bg: colors.errorSurface,   text: colors.error   },
  info:    { bg: colors.infoSurface,    text: colors.info    },
  neutral: { bg: colors.border,         text: colors.textSecondary },
};

export const StatusBadge = ({ status, label }: { status: BadgeStatus; label?: string }) => {
  const config = STATUS_CONFIG[status] ?? { label: status, color: 'neutral' as BadgeColor };
  const style  = COLOR_STYLES[config.color];
  const displayLabel = label ?? config.label;

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>{displayLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
  },
  text: { ...typography.label },
});
