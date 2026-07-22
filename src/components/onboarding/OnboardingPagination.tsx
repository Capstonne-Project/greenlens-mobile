import { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { onboardingColors } from './constants';
import type { OnboardingPaginationProps } from './types';

interface DotProps {
  active: boolean;
}

function Dot({ active }: DotProps) {
  const width = useSharedValue(active ? 28 : 8);

  useEffect(() => {
    width.value = withSpring(active ? 28 : 8, { damping: 16, stiffness: 160 });
  }, [active, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
    backgroundColor: active ? onboardingColors.primary : 'rgba(17,24,39,0.12)',
  }));

  return <Animated.View className="mx-1 h-2 rounded-full" style={animatedStyle} />;
}

function OnboardingPaginationComponent({ count, activeIndex }: OnboardingPaginationProps) {
  return (
    <View className="flex-row items-center justify-center py-3" accessibilityRole="tablist">
      {Array.from({ length: count }).map((_, index) => (
        <Dot key={`dot-${index}`} active={index === activeIndex} />
      ))}
    </View>
  );
}

export const OnboardingPagination = memo(OnboardingPaginationComponent);
