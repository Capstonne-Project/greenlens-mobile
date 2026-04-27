import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack initialRouteName="onboarding" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
