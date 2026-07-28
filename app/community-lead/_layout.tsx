import { Stack } from 'expo-router';

import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function CommunityLeadLayout() {
  useRoleGuard('fieldWorker');

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="[id]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
