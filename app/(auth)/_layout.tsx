import { Stack, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthEarthProvider, useAuthEarth } from '@/components/auth/AuthEarthProvider';

function AuthEarthRouteSync() {
  const pathname = usePathname();
  const { snapToMode } = useAuthEarth();

  useEffect(() => {
    if (pathname.includes('onboarding')) {
      snapToMode('hero');
      return;
    }
    // login / register / forgot etc. keep compact earth above dialog
    if (
      pathname.includes('login') ||
      pathname.includes('register') ||
      pathname.includes('forgot') ||
      pathname.includes('verify') ||
      pathname.includes('reset')
    ) {
      snapToMode('header');
    }
  }, [pathname, snapToMode]);

  return null;
}

export default function AuthLayout() {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#D8F3E4', '#EEF9F3', '#FFFFFF']}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      <AuthEarthProvider>
        <AuthEarthRouteSync />
        <Stack
          initialRouteName="onboarding"
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="verify-otp" />
          <Stack.Screen name="reset-password" />
        </Stack>
      </AuthEarthProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
