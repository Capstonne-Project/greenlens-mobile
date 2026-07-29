import { Stack } from 'expo-router';

import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function BadgesLayout() {
  useRoleGuard('citizen');

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
