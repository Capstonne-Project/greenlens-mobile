import { memo, useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { AnimationWrapperProps } from './types';

function AnimationWrapperComponent({
  children,
  delay = 0,
  duration = 520,
  translateY = 18,
  className = '',
}: AnimationWrapperProps) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(translateY);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
    ty.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 120 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 16, stiffness: 140 }));
  }, [delay, duration, opacity, scale, ty]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View className={className} style={animatedStyle}>
      {children}
    </Animated.View>
  );
}

export const AnimationWrapper = memo(AnimationWrapperComponent);
