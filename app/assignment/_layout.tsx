import { Stack } from 'expo-router';

export default function AssignmentLayout() {
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
        name="history"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
