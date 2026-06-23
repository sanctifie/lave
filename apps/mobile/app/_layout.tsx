import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../src/store/auth.store';

export default function RootLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const segments = useSegments();
  const router   = useRouter();

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
