import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const EARTH_DAY_MAP = require('../../../assets/images/onboarding/earth-day-map.jpg');
const EARTH_CLOUDS = require('../../../assets/images/onboarding/earth-clouds.png');
const EARTH_SPHERE_SHADE = require('../../../assets/images/onboarding/earth-sphere-shade.png');

interface RotatingEarthProps {
  size: number;
  durationMs?: number;
  spinning?: boolean;
}

function RotatingEarthComponent({
  size,
  durationMs = 26000,
  spinning = true,
}: RotatingEarthProps) {
  const mapWidth = size * 2.05;
  const earthX = useSharedValue(0);
  const cloudX = useSharedValue(0);

  useEffect(() => {
    if (!spinning) {
      earthX.value = 0;
      cloudX.value = 0;
      return;
    }

    earthX.value = 0;
    cloudX.value = 0;

    earthX.value = withRepeat(
      withTiming(-mapWidth, { duration: durationMs, easing: Easing.linear }),
      -1,
      false
    );
    cloudX.value = withRepeat(
      withTiming(-mapWidth, { duration: durationMs * 0.84, easing: Easing.linear }),
      -1,
      false
    );
  }, [cloudX, durationMs, earthX, mapWidth, spinning]);

  const earthStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: earthX.value }],
  }));

  const cloudStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cloudX.value }],
  }));

  return (
    <View
      accessibilityLabel="Rotating Earth globe"
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          transform: [{ perspective: 900 }, { rotateX: '8deg' }],
        },
      ]}
    >
      <View
        style={[
          styles.clip,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Animated.View style={[{ flexDirection: 'row', height: size, width: mapWidth * 2 }, earthStyle]}>
          <Image source={EARTH_DAY_MAP} style={{ width: mapWidth, height: size }} contentFit="cover" />
          <Image source={EARTH_DAY_MAP} style={{ width: mapWidth, height: size }} contentFit="cover" />
        </Animated.View>

        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <Animated.View
            style={[{ flexDirection: 'row', height: size, width: mapWidth * 2, opacity: 0.38 }, cloudStyle]}
          >
            <Image source={EARTH_CLOUDS} style={{ width: mapWidth, height: size }} contentFit="cover" />
            <Image source={EARTH_CLOUDS} style={{ width: mapWidth, height: size }} contentFit="cover" />
          </Animated.View>
        </View>

        <Image
          pointerEvents="none"
          source={EARTH_SPHERE_SHADE}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.8 }]}
          contentFit="cover"
        />

        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.26)', 'rgba(255,255,255,0.05)', 'transparent']}
          start={{ x: 0.18, y: 0.12 }}
          end={{ x: 0.72, y: 0.78 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
    </View>
  );
}

export const RotatingEarth = memo(RotatingEarthComponent);

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clip: {
    overflow: 'hidden',
    backgroundColor: '#0A2F6B',
  },
});
