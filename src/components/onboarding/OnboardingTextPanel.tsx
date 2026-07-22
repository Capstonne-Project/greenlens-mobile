import { memo, useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AnimationWrapper } from './AnimationWrapper';
import { OnboardingCard } from './OnboardingCard';
import type { OnboardingPageData } from './types';

interface OnboardingTextPanelProps {
  page: OnboardingPageData;
  width: number;
  isActive: boolean;
}

function ImpactMetricCards({ isActive }: { isActive: boolean }) {
  const cards = [
    { label: 'Waste reduced', value: '−24%' },
    { label: 'Actions logged', value: '128' },
    { label: 'CO₂ saved', value: '18kg' },
  ];

  return (
    <View className="mt-4 w-full flex-row justify-between gap-2 px-1">
      {cards.map((card, i) => (
        <SlideUpCard key={card.label} delay={isActive ? 200 + i * 80 : 0} isActive={isActive}>
          <Text className="text-xs font-medium text-textSecondary">{card.label}</Text>
          <Text className="mt-1 text-lg font-bold text-textPrimary">{card.value}</Text>
        </SlideUpCard>
      ))}
    </View>
  );
}

interface SlideUpCardProps {
  children: React.ReactNode;
  delay: number;
  isActive: boolean;
}

function SlideUpCard({ children, delay, isActive }: SlideUpCardProps) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(20);

  useEffect(() => {
    if (!isActive) {
      opacity.value = 0;
      ty.value = 20;
      return;
    }
    opacity.value = withDelay(delay, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
    ty.value = withDelay(delay, withSpring(0, { damping: 16, stiffness: 130 }));
  }, [delay, isActive, opacity, ty]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View className="flex-1 rounded-2xl border border-white/70 bg-white/70 px-3 py-3" style={style}>
      {children}
    </Animated.View>
  );
}

function OnboardingTextPanelComponent({ page, width, isActive }: OnboardingTextPanelProps) {
  return (
    <View style={{ width }} className="px-6">
      <AnimationWrapper key={`${page.id}-${isActive}`} delay={40} translateY={16}>
        <OnboardingCard title={page.title} subtitle={page.subtitle} isActive={isActive} />
      </AnimationWrapper>
      {page.id === 'impact' ? <ImpactMetricCards isActive={isActive} /> : null}
    </View>
  );
}

export const OnboardingTextPanel = memo(OnboardingTextPanelComponent);
