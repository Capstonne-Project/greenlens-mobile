import { Stack } from 'expo-router';

import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function AssignmentLayout() {
  useRoleGuard('fieldWorker');

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="[id]"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="decline"
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="progress"
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="complete"
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen
        name="completed"
        options={{ animation: 'fade', presentation: 'fullScreenModal', gestureEnabled: false }}
      />
      <Stack.Screen
        name="history"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
