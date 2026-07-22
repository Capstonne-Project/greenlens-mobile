import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { onboardingColors } from './constants';
import type { BackgroundGradientProps } from './types';

function BackgroundGradientComponent({ children, className = '' }: BackgroundGradientProps) {
  return (
    <View className={`flex-1 ${className}`} style={styles.root}>
      {children}
    </View>
  );
}

export const BackgroundGradient = memo(BackgroundGradientComponent);

const styles = StyleSheet.create({
  root: {
    backgroundColor: onboardingColors.background,
  },
});
