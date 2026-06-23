import { NotificationService } from './providers/notification';
import { StubNotificationProvider } from './providers/notification/stub';
import { StubPaymentProvider } from './providers/payment/stub';

// Singletons — swapper les stubs par les vrais providers (MeSomb, Africa's Talking)
// sans toucher au reste du code
export const notificationService = new NotificationService(
  new StubNotificationProvider(), // WhatsApp (prioritaire)
  new StubNotificationProvider(), // SMS fallback
);

export const paymentProvider = new StubPaymentProvider();
