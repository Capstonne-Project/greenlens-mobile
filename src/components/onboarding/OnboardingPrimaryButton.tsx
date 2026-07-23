import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TapScale } from '@/components/layout/TapScale';
import { onboardingColors } from './constants';
import type { OnboardingPrimaryButtonProps } from './types';

function OnboardingPrimaryButtonComponent({
  label,
  onPress,
  disabled = false,
}: OnboardingPrimaryButtonProps) {
  return (
    <TapScale disabled={disabled} onPress={onPress} className="w-full">
      <View style={styles.button}>
        <Text className="text-center text-lg font-semibold tracking-wide text-white">{label}</Text>
      </View>
    </TapScale>
  );
}

export const OnboardingPrimaryButton = memo(OnboardingPrimaryButtonComponent);

const styles = StyleSheet.create({
  button: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    paddingVertical: 18,
    backgroundColor: onboardingColors.primary,
    shadowColor: onboardingColors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
});
