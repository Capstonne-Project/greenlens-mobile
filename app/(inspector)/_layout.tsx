import { Stack } from 'expo-router';

import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function InspectorRootLayout() {
  useRoleGuard('inspector');

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="inspection/[id]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
