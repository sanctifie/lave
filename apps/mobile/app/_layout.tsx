import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../src/store/auth.store';
import { registerForPushNotifications, configureForegroundHandler } from '../src/services/push.service';

configureForegroundHandler();

export default function RootLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const segments = useSegments();
  const router   = useRouter();
  const notifListener    = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  // Redirection par rôle
  useEffect(() => {
    const inAuth = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/login');
      return;
    }
    if (isAuthenticated && inAuth && user) {
      router.replace(getRoleRoot(user.role));
    }
  }, [isAuthenticated, segments]);

  // Enregistrement push dès que l'utilisateur est connecté
  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPushNotifications().catch(() => {});
  }, [isAuthenticated]);

  // Listeners notifications
  useEffect(() => {
    notifListener.current = Notifications.addNotificationReceivedListener(() => {
      // Affichage géré par configureForegroundHandler
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      handleNotificationTap(data, router);
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(patient)" />
      <Stack.Screen name="(pharmacy)" />
      <Stack.Screen name="(courier)" />
      <Stack.Screen name="(doctor)" />
    </Stack>
  );
}

function getRoleRoot(role: string): string {
  switch (role) {
    case 'partner_staff': return '/(pharmacy)';
    case 'courier':       return '/(courier)';
    case 'doctor':        return '/(doctor)';
    default:              return '/(patient)';
  }
}

function handleNotificationTap(data: Record<string, string>, router: ReturnType<typeof useRouter>) {
  switch (data.type) {
    case 'appointment_reminder':
      if (data.appointmentId) router.push(`/(patient)/appointments/${data.appointmentId}` as any);
      break;
    case 'consultation_start':
    case 'consultation_complete':
      if (data.appointmentId) router.push(`/(patient)/appointments/${data.appointmentId}` as any);
      break;
    case 'immediate_appointment':
    case 'new_appointment':
    case 'patient_waiting':
      if (data.appointmentId) router.push(`/(doctor)/appointments/${data.appointmentId}` as any);
      break;
    case 'payout':
      router.push('/(doctor)' as any);
      break;
    case 'new_delivery':
      if (data.deliveryId) router.push(`/(courier)/deliveries/${data.deliveryId}` as any);
      break;
    case 'new_prescription':
      router.push('/(pharmacy)/prescriptions' as any);
      break;
    case 'prescription_validated':
      if (data.orderId) router.push('/(patient)/orders' as any);
      break;
  }
}
