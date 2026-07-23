import { RotatingEarth } from '@/components/onboarding/RotatingEarth';
import {
  AUTH_LOGIN_DIALOG_TOP_RATIO,
  AUTH_LOGIN_HEADER_EARTH_MAX,
} from '@/components/auth/auth-layout';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type AuthEarthMode = 'hero' | 'header';

interface AuthEarthContextValue {
  morphToHeader: () => Promise<void>;
  snapToMode: (mode: AuthEarthMode) => void;
}

const AuthEarthContext = createContext<AuthEarthContextValue | null>(null);

export function useAuthEarth(): AuthEarthContextValue {
  const ctx = useContext(AuthEarthContext);
  if (!ctx) {
    throw new Error('useAuthEarth must be used within AuthEarthProvider');
  }
  return ctx;
}

interface AuthEarthProviderProps {
  children: ReactNode;
  initialMode?: AuthEarthMode;
}

export function AuthEarthProvider({ children, initialMode = 'hero' }: AuthEarthProviderProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const heroSize = Math.min(width * 0.72, height < 700 ? 240 : 300);
  const headerSize = Math.min(width * 0.48, AUTH_LOGIN_HEADER_EARTH_MAX);

  const heroTop = height * 0.1;

  // Band between status bar and dialog top — earth sits in the middle.
  // Login SafeScreen already insets top, so dialog edge ≈ insets.top + contentSpacer.
  const dialogTopFromScreen = insets.top + height * AUTH_LOGIN_DIALOG_TOP_RATIO;
  const bandTop = insets.top + 8;
  const bandBottom = dialogTopFromScreen;
  const headerCenterY = (bandTop + bandBottom) / 2;
  const headerTop = headerCenterY - headerSize / 2;

  const progress = useSharedValue(initialMode === 'header' ? 1 : 0);

  const snapToMode = useCallback(
    (mode: AuthEarthMode) => {
      progress.value = mode === 'header' ? 1 : 0;
    },
    [progress]
  );

  const morphToHeader = useCallback(() => {
    return new Promise<void>((resolve) => {
      progress.value = withTiming(1, { duration: 820, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(resolve)();
      });
    });
  }, [progress]);

  const value = useMemo(() => ({ morphToHeader, snapToMode }), [morphToHeader, snapToMode]);

  const earthStyle = useAnimatedStyle(() => {
    const currentSize = interpolate(
      progress.value,
      [0, 1],
      [heroSize, headerSize],
      Extrapolation.CLAMP
    );
    const currentTop = interpolate(progress.value, [0, 1], [heroTop, headerTop], Extrapolation.CLAMP);
    const scale = currentSize / heroSize;
    const centerX = width / 2;
    const centerY = currentTop + currentSize / 2;

    return {
      position: 'absolute' as const,
      width: heroSize,
      height: heroSize,
      left: centerX - heroSize / 2,
      top: centerY - heroSize / 2,
      zIndex: 8,
      transform: [{ scale }],
    };
  });

  return (
    <AuthEarthContext.Provider value={value}>
      <View style={styles.root}>
        <Animated.View style={earthStyle} pointerEvents="none">
          <RotatingEarth size={heroSize} durationMs={28000} spinning />
        </Animated.View>
        <View style={styles.content} pointerEvents="box-none">
          {children}
        </View>
      </View>
    </AuthEarthContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
