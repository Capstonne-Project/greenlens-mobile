import { Stack } from 'expo-router';

export default function ReportFlowLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="address" />
      <Stack.Screen name="form" />
      <Stack.Screen name="success" />
    </Stack>
  );
}
