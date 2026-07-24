import { NotificationService } from './providers/notification';
import { StubNotificationProvider } from './providers/notification/stub';
import { AfricasTalkingProvider } from './providers/notification/africastalking';
import { WhatsAppProvider } from './providers/notification/whatsapp';
import { StubPaymentProvider } from './providers/payment/stub';
import { MyPVITPaymentProvider } from './providers/payment/mypvit';
import { StubVideoProvider } from './providers/video/stub';
import { DailyVideoProvider } from './providers/video/daily';
import { PushService } from './push/service';
import { ExpoPushProvider } from './push/expo';
import { StubPushProvider } from './push/stub';
import { MboloAssistProvider } from './providers/ai';
import { StubAiProvider } from './providers/ai/stub';

// Singletons — swapper les stubs par les vrais providers sans toucher au reste du code

// WhatsApp (canal prioritaire) via Meta Cloud API si configuré, sinon stub.
const whatsappProvider = process.env.WHATSAPP_ACCESS_TOKEN
  ? new WhatsAppProvider()
  : new StubNotificationProvider();

// SMS de repli via Africa's Talking si AT_API_KEY défini, sinon stub (log console).
const smsProvider = process.env.AT_API_KEY
  ? new AfricasTalkingProvider()
  : new StubNotificationProvider();

export const notificationService = new NotificationService(
  whatsappProvider, // WhatsApp (prioritaire)
  smsProvider,      // SMS de repli (Africa's Talking en prod)
);

// MyPVIT activé automatiquement si MYPVIT_URL_CODE est défini en env
export const paymentProvider = process.env.MYPVIT_URL_CODE
  ? new MyPVITPaymentProvider()
  : new StubPaymentProvider();

// Daily.co activé si DAILY_API_KEY défini, sinon stub (URLs de test locales)
export const videoProvider = process.env.DAILY_API_KEY
  ? new DailyVideoProvider()
  : new StubVideoProvider();

// Expo Push — activé si EXPO_ACCESS_TOKEN défini, sinon stub (log console)
export const pushService = new PushService(
  process.env.EXPO_ACCESS_TOKEN
    ? new ExpoPushProvider(process.env.EXPO_ACCESS_TOKEN)
    : new StubPushProvider(),
);

// MBOLO Assist — activé si ANTHROPIC_API_KEY défini, sinon stub.
// L'IA assiste (modération, extraction, pré-contrôle KYC) ; un humain valide toujours.
export const aiProvider = process.env.ANTHROPIC_API_KEY
  ? new MboloAssistProvider()
  : new StubAiProvider();
