import { memo } from 'react';
import { Text, View } from 'react-native';
import { onboardingColors } from './constants';
import type { OnboardingCardProps } from './types';

function OnboardingCardComponent({ title, subtitle }: OnboardingCardProps) {
  return (
    <View className="w-full items-center px-2">
      <Text
        className="text-center text-[28px] font-bold leading-tight tracking-tight"
        style={{ color: onboardingColors.text }}
      >
        {title}
      </Text>
      <Text
        className="mt-3 text-center text-base leading-7"
        style={{ color: onboardingColors.subtitle }}
      >
        {subtitle}
      </Text>
    </View>
  );
}

export const OnboardingCard = memo(OnboardingCardComponent);
