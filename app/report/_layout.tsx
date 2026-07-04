import { useRoleGuard } from '@/hooks/useRoleGuard';
import { Stack } from 'expo-router';

export default function ReportFlowLayout() {
  useRoleGuard('citizen');

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="address" />
      <Stack.Screen name="form" />
      <Stack.Screen name="success" />
      <Stack.Screen name="[id]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
