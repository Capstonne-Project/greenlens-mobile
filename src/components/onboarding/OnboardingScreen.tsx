import { TapScale } from '@/components/layout/TapScale';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ONBOARDING_PAGES, onboardingColors } from './constants';
import { OnboardingCard } from './OnboardingCard';
import { OnboardingPagination } from './OnboardingPagination';
import { OnboardingPrimaryButton } from './OnboardingPrimaryButton';

interface OnboardingScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

function OnboardingScreenComponent({ onComplete, onSkip }: OnboardingScreenProps) {
  const { height } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const isLast = useMemo(() => activeIndex === ONBOARDING_PAGES.length - 1, [activeIndex]);
  const ctaLabel = isLast ? 'Get Started' : 'Continue';
  const page = ONBOARDING_PAGES[activeIndex];
  const compact = height < 720;

  const textOpacity = useSharedValue(1);
  const textY = useSharedValue(0);
  const chromeOpacity = useSharedValue(1);

  useEffect(() => {
    textOpacity.value = 1;
    textY.value = 0;
  }, [textOpacity, textY]);

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));

  const chromeStyle = useAnimatedStyle(() => ({
    opacity: chromeOpacity.value,
  }));

  const finishTransition = useCallback(
    (nextIndex: number) => {
      setActiveIndex(nextIndex);
      textY.value = 14;
      textOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
      textY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      setIsAnimating(false);
    },
    [textOpacity, textY]
  );

  const goNext = useCallback(() => {
    if (isAnimating) return;

    if (isLast) {
      setIsAnimating(true);
      chromeOpacity.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
      textOpacity.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onComplete)();
      });
      return;
    }

    const nextIndex = activeIndex + 1;
    setIsAnimating(true);

    textOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
    textY.value = withTiming(-10, { duration: 200, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(finishTransition)(nextIndex);
    });
  }, [
    activeIndex,
    chromeOpacity,
    finishTransition,
    isAnimating,
    isLast,
    onComplete,
    textOpacity,
    textY,
  ]);

  return (
    <View className="flex-1" style={{ backgroundColor: 'transparent' }}>
      <Animated.View
        className={`flex-row items-center justify-end px-6 ${compact ? 'pt-2' : 'pt-3'}`}
        style={[{ zIndex: 20 }, chromeStyle]}
      >
        <TapScale onPress={onSkip} className="rounded-full px-3 py-2">
          <Text className="text-sm font-medium" style={{ color: onboardingColors.subtitle }}>
            Skip
          </Text>
        </TapScale>
      </Animated.View>

      {/* Space reserved for shared AuthEarth layer */}
      <View style={{ height: height * 0.42 }} />

      <Animated.View className="flex-1 justify-start px-6" style={[{ minHeight: 160 }, textStyle]}>
        <OnboardingCard title={page.title} subtitle={page.subtitle} />
      </Animated.View>

      <Animated.View className="px-6 pb-3" style={chromeStyle}>
        <OnboardingPagination count={ONBOARDING_PAGES.length} activeIndex={activeIndex} />
        <OnboardingPrimaryButton label={ctaLabel} onPress={goNext} />
        <View className="mt-3 h-11 items-center justify-center">
          {isLast ? (
            <TapScale onPress={onSkip} className="items-center py-2">
              <Text className="text-sm font-medium" style={{ color: onboardingColors.subtitle }}>
                Skip
              </Text>
            </TapScale>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

export const OnboardingScreen = memo(OnboardingScreenComponent);
