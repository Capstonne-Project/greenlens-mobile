import { PortalHost } from "@rn-primitives/portal";
import { useAuth } from "@/hooks/useAuth";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";

export default function RootLayout() {
  const { restoreSession } = useAuth();

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="report" />
        <Stack.Screen name="(staff)" />
        <Stack.Screen name="assignment" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <PortalHost />
    </GestureHandlerRootView>
  );
}
