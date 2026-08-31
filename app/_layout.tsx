import { PortalHost } from "@rn-primitives/portal";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { fieldJournalFonts } from "@/theme/fonts";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { restoreSession } = useAuth();
  usePushNotifications();
  const [fontsLoaded] = useFonts(fieldJournalFonts);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const onRootLayout = useCallback(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onRootLayout}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="report" />
          <Stack.Screen name="(staff)" />
          <Stack.Screen name="(inspector)" />
          <Stack.Screen name="assignment" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen
            name="invitation"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
          />
        </Stack>
        <PortalHost />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
