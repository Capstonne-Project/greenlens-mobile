import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { onboardingColors } from './constants';
import type { FloatingIconProps } from './types';

function FloatingIconComponent({
  label,
  emoji,
  delay = 0,
  size = 56,
  className = '',
  style,
}: FloatingIconProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.7);
  const floatY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    scale.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 150 }));
    floatY.value = withDelay(
      delay + 200,
      withRepeat(withTiming(-6, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, [delay, floatY, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: floatY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      accessibilityLabel={label}
      className={className}
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size * 0.34,
        },
        style,
        animatedStyle,
      ]}
    >
      <View style={styles.glass}>
        <Text style={[styles.emoji, { fontSize: size * 0.38 }]}>{emoji}</Text>
      </View>
    </Animated.View>
  );
}

export const FloatingIcon = memo(FloatingIconComponent);

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: onboardingColors.glass,
    borderWidth: 1,
    borderColor: onboardingColors.glassBorder,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    overflow: 'hidden',
  },
  glass: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  emoji: {
    textAlign: 'center',
  },
});
