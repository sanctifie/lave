import { NotificationService } from './providers/notification';
import { StubNotificationProvider } from './providers/notification/stub';
import { StubPaymentProvider } from './providers/payment/stub';
import { MyPVITPaymentProvider } from './providers/payment/mypvit';
import { StubVideoProvider } from './providers/video/stub';

// Singletons — swapper les stubs par les vrais providers sans toucher au reste du code
export const notificationService = new NotificationService(
  new StubNotificationProvider(), // WhatsApp (prioritaire)
  new StubNotificationProvider(), // SMS fallback
);

// MyPVIT activé automatiquement si MYPVIT_URL_CODE est défini en env
export const paymentProvider = process.env.MYPVIT_URL_CODE
  ? new MyPVITPaymentProvider()
  : new StubPaymentProvider();

export const videoProvider = new StubVideoProvider();
