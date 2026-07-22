import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { RotatingEarth } from './RotatingEarth';
import type { EarthIllustrationProps } from './types';

function EarthIllustrationComponent({ size = 280 }: EarthIllustrationProps) {
  const floatY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withTiming(-6, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [floatY]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <Animated.View style={[styles.stage, { width: size, height: size }, floatStyle]}>
      <View style={[styles.earthWrap, { width: size, height: size }]}>
        <RotatingEarth size={size} durationMs={26000} spinning />
      </View>
    </Animated.View>
  );
}

export const EarthIllustration = memo(EarthIllustrationComponent);

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  earthWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
